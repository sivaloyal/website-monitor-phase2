const performanceService = require("../services/performanceService");
const { MonitorHistory } = require("../models/Schemas");
const { captureWithPlaywright } = require('../utils/harCapture');

const getUrl = (req) => {
    const { url } = req.query;
    const bodyUrl = req.body?.url;
    const target = url || bodyUrl;
    if (!target) return null;
    return target.startsWith("http") ? target : `https://${target}`;
};

const getPerformancePayload = (doc) => {
    if (!doc) return {};

    const fallback = {
        desktopMetrics: doc.desktopMetrics || {},
        mobileMetrics: doc.mobileMetrics || {},
        pageSpeed: doc.pageSpeed || {},
        responsiveValidation: doc.responsiveValidation || {},
        lowEndDeviceSimulation: doc.lowEndDeviceSimulation || {},
        mobileUsability: doc.mobileUsability || {},
        monitoringFrequency: doc.monitoringFrequency || '1h',
        performanceScore: doc.performanceScore || doc.desktopMetrics?.performanceScore || 0,
        regressionSignals: doc.regressionSignals || []
    };

    if (!doc.performanceData) return fallback;

    try {
        const parsed = JSON.parse(doc.performanceData);
        return {
            ...parsed,
            desktopMetrics: parsed.desktopMetrics || fallback.desktopMetrics,
            mobileMetrics: parsed.mobileMetrics || fallback.mobileMetrics,
            pageSpeed: parsed.pageSpeed || fallback.pageSpeed,
            responsiveValidation: parsed.responsiveValidation || fallback.responsiveValidation,
            lowEndDeviceSimulation: parsed.lowEndDeviceSimulation || fallback.lowEndDeviceSimulation,
            mobileUsability: parsed.mobileUsability || fallback.mobileUsability,
            monitoringFrequency: parsed.monitoringFrequency || fallback.monitoringFrequency,
            performanceScore: parsed.performanceScore || fallback.performanceScore,
            regressionSignals: parsed.regressionSignals || fallback.regressionSignals
        };
    } catch (error) {
        return fallback;
    }
};

const analyzePerformanceController = async (req, res) => {
    try {
        const normalizedUrl = getUrl(req);

        if (!normalizedUrl) {
            return res.status(400).json({
                success: false,
                message: "URL is required"
            });
        }

        let snapshot = await performanceService.analyzePerformanceSnapshot(normalizedUrl);

        // If PageSpeed lacks resource lists, run a Playwright HAR capture to fill waterfall/largest resources
        const missingResources = !snapshot?.pageSpeed || ((snapshot.pageSpeed.largestResources || []).length === 0 && (snapshot.pageSpeed.resourceWaterfall || []).length === 0);
        if (missingResources) {
            try {
                const playResult = await captureWithPlaywright(normalizedUrl);
                snapshot.pageSpeed = { ...(snapshot.pageSpeed || {}), ...(playResult || {}) };
                snapshot.desktopMetrics = snapshot.desktopMetrics || {};
                if (playResult.largestResources && playResult.largestResources.length) {
                    snapshot.desktopMetrics.largestResources = playResult.largestResources;
                    snapshot.desktopMetrics.largestResourcesCount = playResult.largestResourcesCount || playResult.largestResources.length;
                }
                if (playResult.resourceWaterfall && playResult.resourceWaterfall.length) {
                    snapshot.desktopMetrics.resourceWaterfall = playResult.resourceWaterfall;
                    snapshot.desktopMetrics.waterfallItemsCount = playResult.waterfallItemsCount || playResult.resourceWaterfall.length;
                }
                if (playResult.renderBlockingResources && playResult.renderBlockingResources.length) {
                    snapshot.desktopMetrics.renderBlockingResources = playResult.renderBlockingResources;
                    snapshot.desktopMetrics.renderBlockingCount = playResult.renderBlockingCount || playResult.renderBlockingResources.length;
                }

                // Persist a MonitorHistory record containing this enriched snapshot
                try {
                    const perfDoc = new MonitorHistory({ url: normalizedUrl, performanceData: JSON.stringify(snapshot), checkedAt: new Date() });
                    await perfDoc.save();
                } catch (e) {
                    // ignore persistence errors
                }
            } catch (err) {
                // ignore Playwright capture failures and fall back to existing snapshot
            }
        }

        return res.status(200).json({
            success: true,
            data: snapshot
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getLatestPerformanceController = async (req, res) => {
    try {
        const normalizedUrl = getUrl(req);
        if (!normalizedUrl) return res.status(400).json({ success: false, message: "URL is required" });

        const doc = await MonitorHistory.findOne({ url: normalizedUrl }).sort({ checkedAt: -1 });
        const perf = getPerformancePayload(doc);
        return res.status(200).json({ success: true, data: perf });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getPerformanceHistoryController = async (req, res) => {
    try {
        const normalizedUrl = getUrl(req);
        if (!normalizedUrl) return res.status(400).json({ success: false, message: "URL is required" });

        const docs = await MonitorHistory.find({ url: normalizedUrl }).sort({ checkedAt: -1 }).limit(25);
        const history = docs.map((doc) => {
            const perf = getPerformancePayload(doc);
            return {
                checkedAt: doc.checkedAt,
                performance: perf,
                desktopMetrics: perf.desktopMetrics || {},
                mobileMetrics: perf.mobileMetrics || {},
                pageSpeed: perf.pageSpeed || {},
                regressionSignals: perf.regressionSignals || []
            };
        });
        return res.status(200).json({ success: true, data: history });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getPerformanceMobileController = async (req, res) => {
    try {
        const normalizedUrl = getUrl(req);
        if (!normalizedUrl) return res.status(400).json({ success: false, message: "URL is required" });

        const doc = await MonitorHistory.findOne({ url: normalizedUrl }).sort({ checkedAt: -1 });
        const perf = getPerformancePayload(doc);
        return res.status(200).json({ success: true, data: perf.mobileMetrics || {} });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getPerformanceDesktopController = async (req, res) => {
    try {
        const normalizedUrl = getUrl(req);
        if (!normalizedUrl) return res.status(400).json({ success: false, message: "URL is required" });

        const doc = await MonitorHistory.findOne({ url: normalizedUrl }).sort({ checkedAt: -1 });
        const perf = getPerformancePayload(doc);
        return res.status(200).json({ success: true, data: perf.desktopMetrics || {} });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getPerformanceTrendsController = async (req, res) => {
    try {
        const normalizedUrl = getUrl(req);
        if (!normalizedUrl) return res.status(400).json({ success: false, message: "URL is required" });

        const docs = await MonitorHistory.find({ url: normalizedUrl }).sort({ checkedAt: 1 }).limit(20);
        const trends = docs.map((doc) => {
            const perf = getPerformancePayload(doc);
            return {
                checkedAt: doc.checkedAt,
                monitoringFrequency: perf.monitoringFrequency || '1h',
                desktopPerformanceScore: perf.desktopMetrics?.performanceScore || perf.performanceScore || 0,
                mobilePerformanceScore: perf.mobileMetrics?.performanceScore || 0,
                desktopLcp: perf.desktopMetrics?.lcp || null,
                desktopCls: perf.desktopMetrics?.cls || null,
                desktopInp: perf.desktopMetrics?.inp || null,
                desktopTtfb: perf.desktopMetrics?.ttfb || null,
                mobileLcp: perf.mobileMetrics?.lcp || null,
                mobileCls: perf.mobileMetrics?.cls || null,
                mobileInp: perf.mobileMetrics?.inp || null,
                mobileTtfb: perf.mobileMetrics?.ttfb || null
            };
        });
        return res.status(200).json({ success: true, data: trends });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getPerformanceResourcesController = async (req, res) => {
    try {
        const normalizedUrl = getUrl(req);
        if (!normalizedUrl) return res.status(400).json({ success: false, message: "URL is required" });

        const doc = await MonitorHistory.findOne({ url: normalizedUrl }).sort({ checkedAt: -1 });
        const perf = getPerformancePayload(doc);
        const resources = perf.pageSpeed?.largestResources || perf.desktopMetrics?.largestResources || [];
        return res.status(200).json({ success: true, data: resources });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getPerformanceWaterfallController = async (req, res) => {
    try {
        const normalizedUrl = getUrl(req);
        if (!normalizedUrl) return res.status(400).json({ success: false, message: "URL is required" });

        const doc = await MonitorHistory.findOne({ url: normalizedUrl }).sort({ checkedAt: -1 });
        const perf = getPerformancePayload(doc);
        const waterfall = perf.pageSpeed?.resourceWaterfall || [];
        return res.status(200).json({ success: true, data: waterfall });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getPerformanceRegressionsController = async (req, res) => {
    try {
        const normalizedUrl = getUrl(req);
        if (!normalizedUrl) return res.status(400).json({ success: false, message: "URL is required" });

        const docs = await MonitorHistory.find({ url: normalizedUrl }).sort({ checkedAt: -1 }).limit(10);
        const regressions = docs.slice(1).map((doc, index) => {
            const currentPerf = getPerformancePayload(doc);
            const previousPerf = getPerformancePayload(docs[index]);
            return {
                checkedAt: doc.checkedAt,
                previousScore: previousPerf.desktopMetrics?.performanceScore || 0,
                currentScore: currentPerf.desktopMetrics?.performanceScore || 0,
                regression: (currentPerf.desktopMetrics?.performanceScore || 0) < (previousPerf.desktopMetrics?.performanceScore || 0)
            };
        }).filter((item) => item.regression);
        return res.status(200).json({ success: true, data: regressions });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getPerformanceMobileUsabilityController = async (req, res) => {
    try {
        const normalizedUrl = getUrl(req);
        if (!normalizedUrl) return res.status(400).json({ success: false, message: "URL is required" });

        const doc = await MonitorHistory.findOne({ url: normalizedUrl }).sort({ checkedAt: -1 });
        const perf = getPerformancePayload(doc);
        return res.status(200).json({ success: true, data: perf.mobileUsability || {} });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

    const captureHarController = async (req, res) => {
        try {
            const normalizedUrl = getUrl(req);
            if (!normalizedUrl) return res.status(400).json({ success: false, message: 'URL is required' });

            const result = await captureWithPlaywright(normalizedUrl);

            // Optionally persist into MonitorHistory for later retrieval
            try {
                const perfDoc = new MonitorHistory({ url: normalizedUrl, performanceData: JSON.stringify({ pageSpeed: result, desktopMetrics: { pageSizeKb: result.pageSizeKb || 0 }, timestamp: new Date() }), checkedAt: new Date() });
                await perfDoc.save();
            } catch (e) {
                // ignore persistence errors
            }

            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    };

module.exports = {
    analyzePerformanceController,
    getLatestPerformanceController,
    getPerformanceHistoryController,
    getPerformanceMobileController,
    getPerformanceDesktopController,
    getPerformanceTrendsController,
    getPerformanceResourcesController,
    getPerformanceWaterfallController,
    getPerformanceRegressionsController,
    getPerformanceMobileUsabilityController,
    captureHarController
};