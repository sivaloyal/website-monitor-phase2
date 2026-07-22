const { chromium } = require('playwright');

async function captureWithPlaywright(targetUrl, opts = {}) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const entries = [];

    page.on('requestfinished', async (request) => {
        try {
            const response = await request.response();
            const headers = response ? response.headers() : {};
            let length = Number(headers['content-length'] || headers['Content-Length'] || 0) || 0;
            if (!length) {
                try {
                    const body = await response.body();
                    length = body ? body.length : 0;
                } catch (e) {}
            }

            entries.push({
                url: request.url(),
                method: request.method(),
                resourceType: request.resourceType() || 'resource',
                status: response ? response.status() : 0,
                transferSize: length,
                timing: request.timing ? request.timing() : null
            });
        } catch (e) {}
    });

    const start = Date.now();
    try {
        await page.goto(targetUrl, { waitUntil: 'load', timeout: opts.timeout || 45000 });
    } catch (err) {}

    let navTiming = null;
    try {
        navTiming = await page.evaluate(() => {
            const nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')?.[0]) || null;
            const fcp = (performance.getEntriesByName && performance.getEntriesByName('first-contentful-paint')?.[0]) || null;
            return {
                loadEventEnd: nav?.loadEventEnd || (window.performance.timing && window.performance.timing.loadEventEnd) || 0,
                firstContentfulPaint: fcp?.startTime || 0
            };
        });
    } catch (e) {
        navTiming = null;
    }

    await page.waitForTimeout(800);
    await browser.close();

    const resourceWaterfall = entries.slice(0, 200).map(e => ({ url: e.url, resourceType: e.resourceType, transferSize: e.transferSize }));
    const largestResources = [...resourceWaterfall].sort((a,b)=> (b.transferSize||0)-(a.transferSize||0)).slice(0, 10);

    const pageLoadTime = navTiming && navTiming.loadEventEnd ? Math.max(0, Math.round(navTiming.loadEventEnd)) : (Date.now() - start);
    const firstContentfulPaint = navTiming && navTiming.firstContentfulPaint ? Math.round(navTiming.firstContentfulPaint) : null;

    const renderBlocking = firstContentfulPaint ? resourceWaterfall.filter(r => r.resourceType === 'script').slice(0, 20) : [];

    return {
        url: targetUrl,
        pageLoadTime: `${pageLoadTime} ms`,
        firstContentfulPaint: firstContentfulPaint !== null ? `${firstContentfulPaint} ms` : null,
        resourceWaterfall,
        largestResources,
        largestResourcesCount: largestResources.length,
        waterfallItemsCount: resourceWaterfall.length,
        renderBlockingResources: renderBlocking.slice(0, 10),
        renderBlockingCount: renderBlocking.length,
        criticalRequestChain: [],
        criticalRequestChainsCount: 0
    };
}

module.exports = { captureWithPlaywright };
