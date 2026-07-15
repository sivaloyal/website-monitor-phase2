import React from 'react';
import { 
  Eye, CheckCircle2, XCircle, AlertTriangle, Layers, 
  Sparkles, Accessibility, Laptop, Smartphone 
} from 'lucide-react';

export default function AccessibilityAudit({ uiUxData, mobileFriendliness }) {
  if (!uiUxData) {
    return (
      <div className="glass-card p-10 text-center text-slate-500 max-w-2xl mx-auto my-6 animate-fade-in-up">
        <Accessibility className="h-10 w-10 text-slate-600 mx-auto mb-4 animate-bounce" />
        <h4 className="font-extrabold text-slate-400">No Accessibility Telemetry Audited</h4>
        <p className="text-xs text-slate-500 mt-2">Run a scan above to see real-time UI/UX accessibility audits and compliance alerts.</p>
      </div>
    );
  }

  const {
    uiHealthScore = 100,
    lowContrastViolations = [],
    missingLabelsViolations = [],
    emptyButtonsViolations = []
  } = uiUxData;

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getGradientId = (score) => {
    if (score >= 90) return 'url(#accEmeraldGrad)';
    if (score >= 70) return 'url(#accAmberGrad)';
    return 'url(#accRoseGrad)';
  };

  const totalViolations = 
    lowContrastViolations.length + 
    missingLabelsViolations.length + 
    emptyButtonsViolations.length +
    (!mobileFriendliness?.viewportConfigured ? 1 : 0);

  return (
    <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
      
      {/* Overview Accessibility Score Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Accessibility score Circular progress gauge */}
        <div className="col-span-12 md:col-span-4 glass-card p-6 flex flex-col items-center justify-center text-center">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider w-full text-left mb-4 flex items-center gap-2">
            <Accessibility className="h-4 w-4 text-emerald-400" />
            Accessibility Rating
          </h3>
          
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <defs>
                <linearGradient id="accEmeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="accAmberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
                <linearGradient id="accRoseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f87171" />
                  <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>
              </defs>
              <circle cx="72" cy="72" r="62" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="8"></circle>
              <circle
                cx="72"
                cy="72"
                r="62"
                fill="transparent"
                stroke={getGradientId(uiHealthScore)}
                strokeWidth="8"
                strokeDasharray={389.5}
                strokeDashoffset={389.5 - (389.5 * uiHealthScore) / 100}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-in-out"
              ></circle>
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className={`text-4xl font-black tracking-tight ${getScoreColor(uiHealthScore)}`}>{uiHealthScore}%</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">WCAG Compliance</span>
            </div>
          </div>
        </div>

        {/* Accessibility Probes and checklist */}
        <div className="col-span-12 md:col-span-8 glass-card p-6 flex flex-col justify-between">
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-4">
              <Eye className="h-4 w-4 text-indigo-400" />
              WCAG Accessibility Pillars
            </span>
            
            <div className="space-y-3.5 mt-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/40">
                <span className="text-slate-400">Total Checked Violations:</span>
                <span className={`font-extrabold text-[11px] px-2 py-0.5 rounded-full ${totalViolations === 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400 animate-pulse'}`}>
                  {totalViolations} {totalViolations === 1 ? 'Anomaly' : 'Anomalies'} Detected
                </span>
              </div>
              
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/40">
                <span className="text-slate-400">Low Contrast Ratio Elements:</span>
                <span className={`font-bold ${lowContrastViolations.length > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                  {lowContrastViolations.length} items checked
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/40">
                <span className="text-slate-400">Empty Button Elements:</span>
                <span className={`font-bold ${emptyButtonsViolations.length > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                  {emptyButtonsViolations.length} items checked
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-400">Unbound Form Input Labels:</span>
                <span className={`font-bold ${missingLabelsViolations.length > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                  {missingLabelsViolations.length} items checked
                </span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 italic mt-4 border-t border-slate-800/40 pt-3">
            * Scans evaluate element background-color contrasts, active ARIA descriptions, and form tag attributes.
          </p>
        </div>

      </div>

      {/* WCAG Compliance Audits detail boards */}
      <div className="glass-card p-6 space-y-6">
        
        <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="text-slate-200 font-extrabold text-lg flex items-center gap-2">
              <Eye className="text-emerald-400 h-5 w-5" />
              UI/UX Visual Accessibility Audits
            </h3>
            <p className="text-xs text-slate-500 mt-1">Verifying WCAG contrast ratios, input element bindings, and interactive button nodes.</p>
          </div>
        </div>

        <div className="space-y-6">
          
          {/* Contrast warnings */}
          <div>
            <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px] mb-3">Contrast Ratio Violations</span>
            {lowContrastViolations.length === 0 ? (
              <div className="p-5 border border-dashed border-slate-800 text-center text-slate-500 text-xs rounded-xl flex items-center justify-center gap-2 bg-dark-900/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                No low contrast anomalies detected. Contrast ratios satisfy WCAG AAA standards (&gt;4.5:1).
              </div>
            ) : (
              <div className="space-y-3">
                {lowContrastViolations.map((v, i) => (
                  <div key={i} className="p-4 bg-dark-850/40 border-l-4 border-l-amber-500 border border-slate-800/60 rounded-xl flex gap-3.5 text-xs hover:border-slate-700 transition-all shadow-md">
                    <AlertTriangle className="text-amber-500 h-5 w-5 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <code className="text-slate-300 font-mono text-[10px] bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800/60 inline-block mb-1">{v.element}</code>
                      <p className="text-slate-200 font-semibold">{v.message}</p>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Suggestion: Increase text color luminance or adjust background opacity to improve reading clarity on mobile devices.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input ARIA Labels warnings */}
          <div>
            <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px] mb-3">Input Label Binding Warnings</span>
            {missingLabelsViolations.length === 0 ? (
              <div className="p-5 border border-dashed border-slate-800 text-center text-slate-500 text-xs rounded-xl flex items-center justify-center gap-2 bg-dark-900/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                All form input elements are successfully bound to corresponding label fields.
              </div>
            ) : (
              <div className="space-y-3">
                {missingLabelsViolations.map((v, i) => (
                  <div key={i} className="p-4 bg-dark-850/40 border-l-4 border-l-rose-500 border border-slate-800/60 rounded-xl flex gap-3.5 text-xs hover:border-slate-700 transition-all shadow-md">
                    <XCircle className="text-rose-400 h-5 w-5 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <code className="text-slate-300 font-mono text-[10px] bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800/60 inline-block mb-1">{v.element}</code>
                      <p className="text-slate-200 font-semibold">{v.message}</p>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Suggestion: Add a corresponding label tag with a matching htmlFor attribute, or use the aria-label="Description" attribute directly on the element.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Empty buttons warnings */}
          <div>
            <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px] mb-3">Empty Buttons Warning Log</span>
            {emptyButtonsViolations.length === 0 ? (
              <div className="p-5 border border-dashed border-slate-800 text-center text-slate-500 text-xs rounded-xl flex items-center justify-center gap-2 bg-dark-900/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                No empty interactive button tags found. Screen readers can scan descriptive textual anchors correctly.
              </div>
            ) : (
              <div className="space-y-3">
                {emptyButtonsViolations.map((v, i) => (
                  <div key={i} className="p-4 bg-dark-850/40 border-l-4 border-l-rose-500 border border-slate-800/60 rounded-xl flex gap-3.5 text-xs hover:border-slate-700 transition-all shadow-md">
                    <XCircle className="text-rose-400 h-5 w-5 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <code className="text-slate-300 font-mono text-[10px] bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800/60 inline-block mb-1">{v.element}</code>
                      <p className="text-slate-200 font-semibold">{v.message}</p>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Suggestion: Screen readers cannot parse empty tags. Add inner descriptive text anchors, or bind aria-label="Button Function" to provide direct auditable headers.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
