const axios = require("axios");

const normalizeMetric = (value, fallback = null) => {
    if (value === null || value === undefined || value === "") return fallback;
    return value;
};

const parseNumericScore = (value) => {
    if (typeof value === "number") return Math.round(value * 100);
    if (typeof value === "string") {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

const toDisplayValue = (value, unit = "s", precision = 2) => {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") {
        return `${value.toFixed(value >= 10 ? 0 : precision)} ${unit}`.trim();
    }
    if (typeof value === "string") {
        return value.trim();
    }
    return String(value);
};

const normalizeMonitoringFrequency = (value = '1h') => {
    const raw = String(value || '').trim().toLowerCase();
    if (['1h', 'hourly', 'hour'].includes(raw)) return '1h';
    if (['3h', '3hour', '3-hour', '3 hours'].includes(raw)) return '3h';
    if (['6h', '6hour', '6-hour', '6 hours'].includes(raw)) return '6h';
    if (['12h', '12hour', '12-hour', '12 hours'].includes(raw)) return '12h';
    if (['24h', 'daily', 'day', '1d', '24-hour', '24 hours'].includes(raw)) return '24h';
    return '1h';
};

const getAuditValue = (audits, keys, fallback = null) => {
    if (!audits || typeof audits !== "object") return fallback;
    for (const key of keys) {
        const audit = audits[key];
        if (!audit) continue;
        if (audit.displayValue !== undefined && audit.displayValue !== null && audit.displayValue !== "") {
            return audit.displayValue;
        }
        if (audit.numericValue !== undefined && audit.numericValue !== null) {
            return toDisplayValue(audit.numericValue, key.includes("time") || key.includes("response") ? "ms" : "s");
        }
        if (audit.score !== undefined && audit.score !== null) {
            return toDisplayValue(audit.score * 100, "", 0);
        }
    }
    return fallback;
};

const deriveScoreFromContext = (context) => {
    if (!context || typeof context !== "object") return null;
    const loadTimeMs = Number(context.loadTimeMs || 0);
    const ttfbMs = Number(context.ttfbMs || 0);
    const pageSizeKb = Number(context.pageSizeKb || 0);
    const totalNodes = Number(context.totalNodes || 0);
    const unminifiedCount = Number(context.unminifiedCount || 0);

    let score = 100;
    if (loadTimeMs > 2000) score -= 20;
    else if (loadTimeMs > 800) score -= 8;
    if (ttfbMs > 400) score -= 15;
    if (pageSizeKb > 180) score -= 8;
    if (totalNodes > 700) score -= 10;
    if (unminifiedCount > 4) score -= 8;
    return Math.max(10, score);
};

const buildPerformanceSnapshot = async (payload, url, context = {}) => {
    const monitoringFrequency = normalizeMonitoringFrequency(context.monitoringFrequency || context.monitoring_frequency || '1h');
    const desktop = payload.desktop?.lighthouseResult || payload.desktop || {};
    const mobile = payload.mobile?.lighthouseResult || payload.mobile || {};
    const desktopAudits = desktop.audits || {};
    const mobileAudits = mobile.audits || {};
    const desktopCategories = desktop.categories || {};
    const mobileCategories = mobile.categories || {};

    const desktopScore = parseNumericScore(desktopCategories.performance?.score) || deriveScoreFromContext(context);
    const mobileScore = parseNumericScore(mobileCategories.performance?.score) || deriveScoreFromContext(context);

    const desktopMetrics = {
        performanceScore: desktopScore,
        lcp: normalizeMetric(getAuditValue(desktopAudits, ["largest-contentful-paint"], toDisplayValue(context.lcp || null, "s")), null),
        fcp: normalizeMetric(getAuditValue(desktopAudits, ["first-contentful-paint"], toDisplayValue(context.fcp || null, "s")), null),
        inp: normalizeMetric(getAuditValue(desktopAudits, ["interaction-to-next-paint"], toDisplayValue(context.inp || null, "ms")), null),
        cls: normalizeMetric(getAuditValue(desktopAudits, ["cumulative-layout-shift"], toDisplayValue(context.cls || null, "")), null),
        tbt: normalizeMetric(getAuditValue(desktopAudits, ["total-blocking-time"], toDisplayValue(context.tbt || null, "ms")), null),
        tti: normalizeMetric(getAuditValue(desktopAudits, ["interactive"], toDisplayValue(context.tti || null, "s")), null),
        speedIndex: normalizeMetric(getAuditValue(desktopAudits, ["speed-index"], toDisplayValue(context.speedIndex || null, "s")), null),
        ttfb: normalizeMetric(getAuditValue(desktopAudits, ["server-response-time"], toDisplayValue(context.ttfbMs || null, "ms")), null),
        accessibilityScore: parseNumericScore(desktopCategories.accessibility?.score),
        bestPracticesScore: parseNumericScore(desktopCategories["best-practices"]?.score),
        seoScore: parseNumericScore(desktopCategories.seo?.score),
        securityScore: 100,
        uiHealthScore: parseNumericScore(desktopAudits["font-size"]?.score || desktopAudits.viewport?.score || 1),
        pageSizeKb: Math.max(40, Math.round((desktopAudits["resource-summary"]?.details?.items || []).reduce((sum, item) => sum + (item.transferSize || 0), 0) / 1024) || Number(context.pageSizeKb || 0) || 40),
        resourceCount: (desktopAudits["resource-summary"]?.details?.items || []).length,
        largestResources: (desktopAudits["resource-summary"]?.details?.items || []).slice(0, 5).map((item) => ({ resourceType: item.resourceType || "resource", transferSize: item.transferSize || 0 })),
        imageOptimization: {
            optimizedImages: desktopAudits["uses-optimized-images"] || null,
            modernImageFormats: desktopAudits["modern-image-formats"] || null,
            responsiveImages: desktopAudits["uses-responsive-images"] || null,
            offscreenImages: desktopAudits["offscreen-images"] || null,
        },
        timestamp: new Date().toISOString(),
        monitoringFrequency
    };

    const mobileMetrics = {
        performanceScore: mobileScore,
        lcp: normalizeMetric(getAuditValue(mobileAudits, ["largest-contentful-paint"], toDisplayValue(context.mobileLcp || null, "s")), null),
        fcp: normalizeMetric(getAuditValue(mobileAudits, ["first-contentful-paint"], toDisplayValue(context.mobileFcp || null, "s")), null),
        inp: normalizeMetric(getAuditValue(mobileAudits, ["interaction-to-next-paint"], toDisplayValue(context.mobileInp || null, "ms")), null),
        cls: normalizeMetric(getAuditValue(mobileAudits, ["cumulative-layout-shift"], toDisplayValue(context.mobileCls || null, "")), null),
        tbt: normalizeMetric(getAuditValue(mobileAudits, ["total-blocking-time"], toDisplayValue(context.mobileTbt || null, "ms")), null),
        tti: normalizeMetric(getAuditValue(mobileAudits, ["interactive"], toDisplayValue(context.mobileTti || null, "s")), null),
        speedIndex: normalizeMetric(getAuditValue(mobileAudits, ["speed-index"], toDisplayValue(context.mobileSpeedIndex || null, "s")), null),
        ttfb: normalizeMetric(getAuditValue(mobileAudits, ["server-response-time"], toDisplayValue(context.mobileTtfb || null, "ms")), null),
        accessibilityScore: parseNumericScore(mobileCategories.accessibility?.score),
        bestPracticesScore: parseNumericScore(mobileCategories["best-practices"]?.score),
        seoScore: parseNumericScore(mobileCategories.seo?.score),
        securityScore: 100,
        uiHealthScore: parseNumericScore(mobileAudits["font-size"]?.score || mobileAudits.viewport?.score || 1),
        pageSizeKb: Math.max(40, Math.round((mobileAudits["resource-summary"]?.details?.items || []).reduce((sum, item) => sum + (item.transferSize || 0), 0) / 1024) || Number(context.pageSizeKb || 0) || 40),
        resourceCount: (mobileAudits["resource-summary"]?.details?.items || []).length,
        largestResources: (mobileAudits["resource-summary"]?.details?.items || []).slice(0, 5).map((item) => ({ resourceType: item.resourceType || "resource", transferSize: item.transferSize || 0 })),
        imageOptimization: {
            optimizedImages: mobileAudits["uses-optimized-images"] || null,
            modernImageFormats: mobileAudits["modern-image-formats"] || null,
            responsiveImages: mobileAudits["uses-responsive-images"] || null,
            offscreenImages: mobileAudits["offscreen-images"] || null,
        },
        timestamp: new Date().toISOString(),
        monitoringFrequency
    };

    const responsiveValidation = {
        horizontalOverflow: (desktopAudits["content-width"]?.score || 1) < 0.9,
        responsiveRenderingIssues: (desktopAudits.viewport?.score || 1) < 0.9,
        fontScalingProblems: (desktopAudits["font-size"]?.score || 1) < 0.9,
        touchTargetIssues: (desktopAudits["tap-targets"]?.score || 1) < 0.9,
        viewportProblems: (desktopAudits.viewport?.score || 1) < 0.9
    };

    const lowEndDeviceSimulation = {
        cpuThrottling: true,
        networkProfile: "Slow 4G",
        slowNetwork: true,
        fast4G: false,
        slow4G: true,
        threeG: false
    };

    const detectedIssues = [
        responsiveValidation.horizontalOverflow,
        responsiveValidation.viewportProblems,
        responsiveValidation.touchTargetIssues,
        responsiveValidation.fontScalingProblems
    ].filter(Boolean).length;

    const mobileUsability = {
        score: Math.max(10, Math.min(100, mobileScore - detectedIssues * 2)),
        horizontalOverflow: responsiveValidation.horizontalOverflow,
        viewportProblems: responsiveValidation.viewportProblems,
        touchTargetIssues: responsiveValidation.touchTargetIssues,
        fontScalingProblems: responsiveValidation.fontScalingProblems,
        networkProfile: lowEndDeviceSimulation.networkProfile
    };

    // Helper to find available audit details items from multiple possible audit keys
    const getAuditItems = (audits, keys) => {
        for (const key of keys) {
            const a = audits[key];
            if (!a) continue;
            const details = a.details || {};
            if (Array.isArray(details.items) && details.items.length > 0) return details.items;
            // Some audits nest arrays differently (e.g., chainedRequests)
            if (Array.isArray(details.chainedRequests) && details.chainedRequests.length > 0) return details.chainedRequests;
        }
        return [];
    };

    // Try several audit keys to robustly extract network requests and resource summaries
    const resourceItems = getAuditItems(desktopAudits, ["resource-summary", "network-requests", "network-requests-data", "network-requests-list", "network-requests-v2"])
        .map((item) => ({ url: item.url || item.request?.url || item.resourceType || 'unknown', transferSize: item.transferSize || item.transfer_size || item.transferBytes || 0, resourceType: item.resourceType || item.mimeType || 'resource' }));

    // If no resource items from resource-summary, try parsing top-level network logs
    if (resourceItems.length === 0) {
        const alt = getAuditItems(desktopAudits, ["network-requests", "networkRecords", "requests", "network-log"]);
        for (const it of alt) {
            const url = it.url || it.request?.url || it.name || it.resource || 'unknown';
            const size = it.transferSize || it.size || it.transfer_size || 0;
            resourceItems.push({ url, transferSize: size, resourceType: it.resourceType || it.mimeType || 'resource' });
        }

        // If still empty, try to extract resource URLs from provided HTML and probe their sizes
        if (resourceItems.length === 0 && context && context.html) {
            try {
                const html = String(context.html || '');
                const urlMatches = Array.from(html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)).map(m => m[1]).filter(Boolean);
                const unique = Array.from(new Set(urlMatches)).slice(0, 20);
                const absolute = unique.map(u => {
                    try {
                        if (u.startsWith('http')) return u;
                        const base = new URL(url);
                        return new URL(u, base).toString();
                    } catch (e) {
                        return u;
                    }
                });

                const headRequests = absolute.slice(0, 10).map(async (u) => {
                    try {
                        const resp = await axios.head(u, { timeout: 3500, maxRedirects: 2 });
                        const len = Number(resp.headers['content-length'] || resp.headers['Content-Length'] || 0) || 0;
                        return { url: u, transferSize: len, resourceType: (u.split('.').pop() || 'resource') };
                    } catch (e) {
                        return { url: u, transferSize: 0, resourceType: (u.split('.').pop() || 'resource') };
                    }
                });

                const results = await Promise.allSettled(headRequests);
                for (const r of results) {
                    if (r.status === 'fulfilled' && r.value) resourceItems.push(r.value);
                }
            } catch (e) {
                // ignore HTML extraction errors
            }
        }
    }

    // Build largest resources sorted by transfer size
    const largestResourcesList = [...(resourceItems || [])].sort((a, b) => (b.transferSize || 0) - (a.transferSize || 0)).slice(0, 5).map(r => ({ resourceType: r.resourceType, transferSize: r.transferSize, url: r.url }));

    // Render blocking resources fallback: look for specific audits or any request flagged as blocking
    const renderBlockingItems = getAuditItems(desktopAudits, ["render-blocking-resources", "renderBlockingResources", "render-blocking"]).map(i => ({ url: i.url || i.request?.url || 'unknown', resourceType: i.resourceType || 'script' }));

    // Critical request chains fallback
    const criticalChains = (desktopAudits["critical-request-chains"]?.details?.chainedRequests || getAuditItems(desktopAudits, ["critical-request-chains", "critical-chains"]).slice(0,5)).map((item) => ({ url: item.request?.url || item.url || 'unknown' }));

    const pageSpeed = {
        pageLoadTime: normalizeMetric(
            context.loadTimeMs !== undefined && context.loadTimeMs !== null && context.loadTimeMs !== ""
                ? toDisplayValue(Number(context.loadTimeMs) / 1000, "s", 1)
                : getAuditValue(desktopAudits, ["interactive", "speed-index", "first-contentful-paint"], null),
            null
        ),
        resourceWaterfall: (resourceItems || []).slice(0, 12).map((item) => ({ resourceType: item.resourceType || "resource", transferSize: item.transferSize || 0, url: item.url || 'unknown' })),
        largestResources: largestResourcesList,
        imageOptimization: desktopMetrics.imageOptimization,
        renderBlockingResources: renderBlockingItems.slice(0, 8),
        criticalRequestChain: (criticalChains || []).slice(0, 8),
        unusedCss: (desktopAudits["unused-css-rules"]?.details?.items || []).slice(0, 5).map((item) => ({ url: item.url || "unknown" })),
        unusedJavaScript: (desktopAudits["unused-javascript"]?.details?.items || []).slice(0, 5).map((item) => ({ url: item.url || "unknown" }))
    };

    // Mirror useful pageSpeed lists back onto desktopMetrics so other parts of the app
    // (monitorService, controllers) can pick them up consistently when pageSpeed arrays
    // are available from the snapshot.
    if (largestResourcesList && largestResourcesList.length > 0) {
        desktopMetrics.largestResources = largestResourcesList;
        desktopMetrics.largestResourcesCount = largestResourcesList.length;
    }
    if (resourceItems && resourceItems.length > 0) {
        desktopMetrics.resourceWaterfall = resourceItems.slice(0, 24).map(i => ({ url: i.url, resourceType: i.resourceType, transferSize: i.transferSize }));
        desktopMetrics.waterfallItemsCount = desktopMetrics.resourceWaterfall.length;
    }
    if (renderBlockingItems && renderBlockingItems.length > 0) {
        desktopMetrics.renderBlockingResources = renderBlockingItems;
        desktopMetrics.renderBlockingCount = renderBlockingItems.length;
    }
    if (criticalChains && criticalChains.length > 0) {
        desktopMetrics.criticalRequestChain = criticalChains;
        desktopMetrics.criticalRequestChainsCount = criticalChains.length;
    }

    return {
        url,
        desktopMetrics,
        mobileMetrics,
        performanceScore: desktopMetrics.performanceScore,
        pageSpeed,
        responsiveValidation,
        lowEndDeviceSimulation,
        mobileUsability,
        monitoringFrequency,
        timestamp: new Date().toISOString(),
        regressionSignals: [
            desktopMetrics.performanceScore < 80 ? "Performance regression detected" : null,
            mobileMetrics.performanceScore < 80 ? "Mobile regression detected" : null
        ].filter(Boolean)
    };
};

const fetchPageSpeedData = async (url, strategy = "desktop") => {
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(normalizedUrl)}&strategy=${strategy}&category=performance&category=accessibility&category=best-practices&category=seo`;
    const { data } = await axios.get(apiUrl);
    return data;
};

const analyzePerformance = async (url, strategy = "desktop", context = {}) => {
    try {
        const payload = {
            desktop: strategy === "desktop" ? await fetchPageSpeedData(url, "desktop") : null,
            mobile: strategy === "mobile" ? await fetchPageSpeedData(url, "mobile") : null
        };
        return await buildPerformanceSnapshot(payload, url, context);
    } catch (error) {
        throw new Error(
            error.response?.data?.error?.message ||
                error.message ||
                "Failed to analyze performance."
        );
    }
};

const analyzePerformanceSnapshot = async (url, context = {}) => {
    try {
        const [desktopData, mobileData] = await Promise.all([
            fetchPageSpeedData(url, "desktop"),
            fetchPageSpeedData(url, "mobile")
        ]);

        return await buildPerformanceSnapshot({ desktop: desktopData, mobile: mobileData }, url, context);
    } catch (error) {
        throw new Error(
            error.response?.data?.error?.message ||
                error.message ||
                "Failed to fetch performance snapshot."
        );
    }
};

module.exports = {
    analyzePerformance,
    analyzePerformanceSnapshot,
    buildPerformanceSnapshot,
};