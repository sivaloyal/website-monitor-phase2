const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPerformanceSnapshot } = require('../src/services/performanceService');

test('buildPerformanceSnapshot derives desktop and mobile metrics from Lighthouse payloads', () => {
  const payload = {
    desktop: {
      lighthouseResult: {
        categories: {
          performance: { score: 0.92 },
          accessibility: { score: 0.89 },
          'best-practices': { score: 0.95 },
          seo: { score: 0.91 }
        },
        audits: {
          'largest-contentful-paint': { displayValue: '2.4 s' },
          'first-contentful-paint': { displayValue: '1.1 s' },
          'interaction-to-next-paint': { displayValue: '180 ms' },
          'cumulative-layout-shift': { displayValue: '0.04' },
          'total-blocking-time': { displayValue: '120 ms' },
          'speed-index': { displayValue: '2.1 s' },
          'server-response-time': { displayValue: '130 ms' },
          interactive: { displayValue: '3.2 s' },
          'resource-summary': { details: { items: [{ resourceType: 'script', transferSize: 410000 }, { resourceType: 'image', transferSize: 210000 }] } },
          'render-blocking-resources': { details: { items: [{ resourceType: 'script', url: '/app.js' }] } },
          'critical-request-chains': { details: { chainedRequests: [{ request: { url: '/' } }] } },
          'unused-css-rules': { details: { items: [{ url: '/styles.css' }] } },
          'unused-javascript': { details: { items: [{ url: '/app.js' }] } },
          'uses-optimized-images': { score: 0.7, displayValue: '2 images' },
          'modern-image-formats': { score: 0.6, displayValue: '1 image' },
          'uses-responsive-images': { score: 0.8, displayValue: '1 image' },
          'offscreen-images': { score: 0.9, displayValue: '0 images' },
          'font-size': { score: 0.8 },
          viewport: { score: 0.9 },
          'tap-targets': { score: 0.8 },
          'content-width': { score: 0.7 }
        }
      }
    },
    mobile: {
      lighthouseResult: {
        categories: {
          performance: { score: 0.88 },
          accessibility: { score: 0.82 },
          'best-practices': { score: 0.9 },
          seo: { score: 0.87 }
        },
        audits: {
          'largest-contentful-paint': { displayValue: '3.6 s' },
          'first-contentful-paint': { displayValue: '1.8 s' },
          'interaction-to-next-paint': { displayValue: '240 ms' },
          'cumulative-layout-shift': { displayValue: '0.11' },
          'total-blocking-time': { displayValue: '310 ms' },
          'speed-index': { displayValue: '3.7 s' },
          'server-response-time': { displayValue: '220 ms' },
          interactive: { displayValue: '4.5 s' },
          'resource-summary': { details: { items: [{ resourceType: 'script', transferSize: 560000 }, { resourceType: 'image', transferSize: 320000 }] } },
          'render-blocking-resources': { details: { items: [{ resourceType: 'script', url: '/mobile.js' }] } },
          'critical-request-chains': { details: { chainedRequests: [{ request: { url: '/mobile' } }] } },
          'unused-css-rules': { details: { items: [{ url: '/mobile.css' }] } },
          'unused-javascript': { details: { items: [{ url: '/mobile.js' }] } },
          'uses-optimized-images': { score: 0.6, displayValue: '3 images' },
          'modern-image-formats': { score: 0.5, displayValue: '2 images' },
          'uses-responsive-images': { score: 0.7, displayValue: '2 images' },
          'offscreen-images': { score: 0.8, displayValue: '1 image' },
          'font-size': { score: 0.7 },
          viewport: { score: 0.8 },
          'tap-targets': { score: 0.7 },
          'content-width': { score: 0.8 }
        }
      }
    }
  };

  const result = buildPerformanceSnapshot(payload, 'https://example.com', { loadTimeMs: 2580, ttfbMs: 540, pageSizeKb: 180, totalNodes: 500, unminifiedCount: 4 });

  assert.equal(result.desktopMetrics.performanceScore, 92);
  assert.equal(result.mobileMetrics.performanceScore, 88);
  assert.equal(result.pageSpeed.largestResources.length, 2);
  assert.equal(result.responsiveValidation.horizontalOverflow, true);
  assert.equal(result.lowEndDeviceSimulation.networkProfile, 'Slow 4G');
  assert.equal(result.monitoringFrequency, '1h');
  assert.equal(result.pageSpeed.pageLoadTime, '2.6 s');
  assert.equal(result.mobileUsability.score, 82);
});
