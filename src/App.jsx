import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./lib/supabase";
import { signUp, signIn, signOut, getProfile, upsertProfile, uploadPhoto, saveAnswers, getNearbyProfiles, sendLike, getMatches, getMessages, sendMessage, subscribeToMessages, proposeTopic, respondToProposal, getPendingProposal, subscribeToProposals, selectTopics, TOPIC_TYPE_META, getCompatibility, getPairGroup, nextExtraTest, refineTrait, TRAIT_KEY, COMPAT_THRESHOLD, MIN_EXTRA_TESTS, MAX_EXTRA_TESTS, getSocialState, sendPass, subscribeToSocial } from "./lib/api";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  :root {
    --cream:#F6F1E9; --warm:#EDE4D4; --terra:#C17A5A; --terra-l:#D4956F;
    --dark:#2C2420; --mid:#6B5B52; --soft:#A89080; --green:#7A9E7E; --white:#fff;
    --surface:#fff; --on-terra:#fff;
    --nav-bg:rgba(246,241,233,.82); --glass:rgba(255,255,255,.55); --glass2:rgba(255,255,255,.45);
    --line-soft:rgba(237,228,212,.6); --line-strong:rgba(237,228,212,.9);
  }
  /* ── MODO NOCHE ─────────────────────────────────────────────────── */
  :root[data-theme="dark"] {
    color-scheme: dark;
    --cream:#16110E; --warm:#2D241E; --surface:#211A16;
    --dark:#F5EEE6; --mid:#CBBDB1; --soft:#9A8B7F;
    --terra:#E0916D; --terra-l:#EBA787; --green:#8FBF96; --white:#211A16;
    --on-terra:#1B1410;
    --nav-bg:rgba(22,17,14,.84); --glass:rgba(33,26,22,.7); --glass2:rgba(33,26,22,.55);
    --line-soft:rgba(255,255,255,.09); --line-strong:rgba(255,255,255,.16);
  }
  :root[data-theme="dark"] .blob-a { opacity:.10; }
  :root[data-theme="dark"] .blob-b { opacity:.08; }
  :root[data-theme="dark"] .blob-c { opacity:.06; }
  :root[data-theme="dark"] .auth-error { color:#ff9b9b;background:rgba(255,120,120,.1);border-color:rgba(255,120,120,.25); }
  :root[data-theme="dark"] ::selection { background:rgba(224,145,109,.35); }
  body, .nav, .k-card, .sidebar, .main { transition:background-color .3s ease,color .3s ease,border-color .3s ease; }

  .icon-btn { width:38px;height:38px;border-radius:50%;border:1px solid var(--line-strong);background:var(--glass);color:var(--dark);cursor:pointer;font-size:17px;display:flex;align-items:center;justify-content:center;transition:.2s;flex-shrink:0; }
  .icon-btn:hover { border-color:var(--terra);transform:translateY(-1px); }
  .icon-btn:focus-visible { outline:2px solid var(--terra);outline-offset:2px; }
  html,body { height:100%; }
  body { font-family:'DM Sans',sans-serif; background:var(--cream); color:var(--dark); min-height:100vh; overflow-x:hidden; }

  .blob { position:fixed; border-radius:50%; filter:blur(120px); pointer-events:none; z-index:0; }
  .blob-a { width:700px;height:700px;background:var(--terra);opacity:.15;top:-200px;right:-150px;animation:b1 14s ease-in-out infinite; }
  .blob-b { width:500px;height:500px;background:var(--green);opacity:.12;bottom:-120px;left:-100px;animation:b2 17s ease-in-out infinite; }
  .blob-c { width:350px;height:350px;background:#D4A574;opacity:.10;top:40%;left:40%;animation:b3 11s ease-in-out infinite; }
  @keyframes b1{0%,100%{transform:translate(0,0)scale(1)}50%{transform:translate(-40px,50px)scale(1.07)}}
  @keyframes b2{0%,100%{transform:translate(0,0)scale(1)}50%{transform:translate(50px,-40px)scale(1.05)}}
  @keyframes b3{0%,100%{transform:translate(0,0)scale(1)}50%{transform:translate(-25px,25px)scale(.94)}}

  .nav { position:fixed;top:0;left:0;right:0;z-index:100;background:var(--nav-bg);backdrop-filter:blur(20px);border-bottom:1px solid var(--line-soft); }
  .nav-inner { max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:20px 48px; }
  .logo { font-family:'Lora',serif;font-size:22px;letter-spacing:-.5px;color:var(--dark);cursor:pointer;user-select:none; }
  .logo em { color:var(--terra);font-style:italic; }
  .nav-r { display:flex;gap:10px;align-items:center; }
  .btn-ghost { background:none;border:none;font-family:'DM Sans',sans-serif;font-size:14px;color:var(--mid);cursor:pointer;padding:9px 18px;border-radius:100px;transition:.2s; }
  .btn-ghost:hover { background:var(--warm);color:var(--dark); }
  .btn-pill { background:var(--terra);border:none;color:var(--on-terra);font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;padding:10px 26px;border-radius:100px;transition:.25s;box-shadow:0 4px 18px rgba(193,122,90,.28); }
  .btn-pill:hover { background:var(--terra-l);transform:translateY(-1px);box-shadow:0 8px 26px rgba(193,122,90,.38); }
  .btn-pill:disabled { opacity:.4;cursor:not-allowed;transform:none;box-shadow:none; }

  .landing-wrap { min-height:100vh;padding-top:72px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;text-align:center; }
  .hero-content { position:relative;z-index:5;display:flex;flex-direction:column;align-items:center;max-width:720px;width:100%;padding:0 32px; }
  .callout { display:inline-flex;align-items:center;gap:10px;background:var(--glass);backdrop-filter:blur(10px);border:1px solid rgba(193,122,90,.22);border-radius:100px;padding:8px 18px;font-size:13px;color:var(--mid);margin-bottom:28px;animation:fadeUp .5s ease both; }
  .callout .strike { text-decoration:line-through;opacity:.5; }
  .callout .arr { color:var(--terra);font-weight:600; }
  .h1 { font-family:'Lora',serif;font-size:clamp(44px,6vw,80px);line-height:1.08;letter-spacing:-2.5px;color:var(--dark);margin-bottom:24px;animation:fadeUp .5s ease .1s both; }
  .h1 em { color:var(--terra);font-style:italic; }
  .hero-p { font-size:18px;color:var(--mid);line-height:1.75;max-width:520px;font-weight:300;margin-bottom:40px;animation:fadeUp .5s ease .2s both; }
  .cta-row { display:flex;gap:14px;justify-content:center;margin-bottom:64px;animation:fadeUp .5s ease .3s both; }
  .btn-big { font-size:16px;padding:14px 36px; }
  .btn-outline { background:var(--glass2);border:1.5px solid var(--line-strong);color:var(--mid);font-family:'DM Sans',sans-serif;font-size:16px;cursor:pointer;padding:14px 36px;border-radius:100px;transition:.2s;backdrop-filter:blur(8px); }
  .btn-outline:hover { border-color:var(--terra);color:var(--terra); }
  .feats { position:relative;z-index:5;display:flex;justify-content:center;gap:36px;flex-wrap:wrap;padding:0 32px 48px;animation:fadeUp .5s ease .4s both; }
  .feat { display:flex;align-items:center;gap:12px;font-size:14px;color:var(--mid); }
  .feat-icon { width:36px;height:36px;border-radius:50%;background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 12px rgba(0,0,0,.07);flex-shrink:0; }

  .overlay { position:fixed;inset:0;z-index:200;background:rgba(44,36,32,.5);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn .2s ease both; }
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  .demo-modal { background:var(--surface);border-radius:28px;width:100%;max-width:960px;max-height:88vh;box-shadow:0 40px 100px rgba(44,36,32,.2);display:grid;grid-template-columns:340px 1fr;overflow:hidden;animation:slideUp .3s ease both; }
  @keyframes slideUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
  .demo-left { background:var(--cream);padding:40px 32px;display:flex;flex-direction:column;border-right:1px solid var(--warm);overflow-y:auto; }
  .demo-close { align-self:flex-end;background:none;border:none;font-size:18px;color:var(--soft);cursor:pointer;margin-bottom:24px;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:.2s; }
  .demo-close:hover { background:var(--warm);color:var(--dark); }
  .demo-avatar { width:68px;height:68px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:16px; }
  .demo-name { font-family:'Lora',serif;font-size:26px;color:var(--dark);margin-bottom:3px; }
  .demo-age  { font-size:14px;color:var(--soft);margin-bottom:20px; }
  .demo-reason { background:rgba(193,122,90,.09);border-radius:12px;padding:14px 16px;margin-bottom:18px; }
  .demo-reason strong { display:block;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--terra);margin-bottom:6px; }
  .demo-reason p { font-size:13px;color:var(--mid);line-height:1.6; }
  .demo-compat-label { display:flex;justify-content:space-between;font-size:12px;color:var(--soft);margin-bottom:6px; }
  .demo-track { height:5px;background:var(--warm);border-radius:100px;overflow:hidden;margin-bottom:28px; }
  .demo-fill  { height:100%;background:var(--green);border-radius:100px; }
  .how-steps { display:flex;flex-direction:column;gap:16px; }
  .how-step  { display:flex;gap:12px;align-items:flex-start; }
  .how-num   { width:26px;height:26px;border-radius:50%;background:var(--terra);color:var(--on-terra);font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px; }
  .how-text strong { display:block;font-size:13px;color:var(--dark);margin-bottom:2px; }
  .how-text span   { font-size:12px;color:var(--soft);line-height:1.5; }
  .demo-right { display:flex;flex-direction:column;max-height:88vh; }
  .demo-chat-hdr { padding:24px 28px 18px;border-bottom:1px solid var(--warm);flex-shrink:0; }
  .demo-chat-hdr h3 { font-family:'Lora',serif;font-size:17px;color:var(--dark);margin-bottom:3px; }
  .demo-chat-hdr p  { font-size:12px;color:var(--soft); }
  .demo-prompt { margin:16px 24px 0;padding:14px 18px;background:rgba(193,122,90,.08);border:1px solid rgba(193,122,90,.18);border-radius:14px;text-align:center;flex-shrink:0; }
  .demo-prompt p     { font-family:'Lora',serif;font-size:14px;color:var(--terra);font-style:italic;line-height:1.5; }
  .demo-prompt small { font-size:11px;color:var(--soft);display:block;margin-top:4px; }
  .demo-msgs { flex:1;overflow-y:auto;padding:16px 24px;display:flex;flex-direction:column;gap:12px; }
  .d-msg { display:flex;flex-direction:column;max-width:72%; }
  .d-msg.sent { align-self:flex-end;align-items:flex-end; }
  .d-msg.recv { align-self:flex-start; }
  .d-bub { padding:11px 15px;border-radius:16px;font-size:14px;line-height:1.6; }
  .sent .d-bub { background:var(--terra);color:var(--on-terra);border-bottom-right-radius:4px; }
  .recv .d-bub { background:var(--cream);color:var(--dark);border-bottom-left-radius:4px; }
  .d-time { font-size:10px;color:var(--soft);margin-top:3px;padding:0 3px; }
  .typing { display:flex;align-items:center;gap:5px;padding:11px 15px;background:var(--cream);border-radius:16px;border-bottom-left-radius:4px;width:fit-content; }
  .typing span { width:6px;height:6px;border-radius:50%;background:var(--soft);animation:bounce 1.2s ease-in-out infinite; }
  .typing span:nth-child(2){animation-delay:.2s} .typing span:nth-child(3){animation-delay:.4s}
  @keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
  .demo-input-row { padding:14px 24px 20px;border-top:1px solid var(--warm);display:flex;gap:10px;align-items:flex-end;flex-shrink:0;background:var(--surface); }
  .d-inp { flex:1;background:var(--cream);border:1.5px solid var(--warm);border-radius:20px;padding:10px 16px;font-family:'DM Sans',sans-serif;font-size:14px;color:var(--dark);outline:none;resize:none;max-height:80px;transition:border-color .2s; }
  .d-inp:focus { border-color:var(--terra); }
  .d-inp::placeholder { color:var(--soft); }
  .d-send { width:40px;height:40px;border-radius:50%;background:var(--terra);border:none;color:var(--on-terra);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:.2s; }
  .d-send:hover { background:var(--terra-l);transform:scale(1.05); }

  .screen-center { min-height:100vh;display:flex;align-items:center;justify-content:center;padding:100px 24px 40px;position:relative; }
  .card { background:var(--surface);border-radius:28px;padding:52px;max-width:560px;width:100%;box-shadow:0 24px 64px rgba(44,36,32,.09);position:relative;z-index:5;animation:fadeUp .5s ease both; }
  .prog-bar  { width:100%;height:3px;background:var(--warm);border-radius:100px;margin-bottom:40px;overflow:hidden; }
  .prog-fill { height:100%;background:var(--terra);border-radius:100px;transition:width .5s ease; }
  .q-label { font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--soft);margin-bottom:12px;font-weight:500; }
  .q-text  { font-family:'Lora',serif;font-size:28px;line-height:1.3;color:var(--dark);margin-bottom:10px; }
  .q-hint  { font-size:13px;color:var(--soft);margin-bottom:28px;font-style:italic; }
  .textarea { width:100%;background:var(--cream);border:1.5px solid var(--warm);border-radius:16px;padding:18px 20px;font-family:'DM Sans',sans-serif;font-size:15px;color:var(--dark);resize:none;min-height:110px;transition:border-color .2s;outline:none; }
  .textarea:focus { border-color:var(--terra); }
  .textarea::placeholder { color:var(--soft); }
  .opts { display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:28px; }
  .opt { background:var(--cream);border:1.5px solid var(--warm);border-radius:14px;padding:14px 16px;font-family:'DM Sans',sans-serif;font-size:14px;color:var(--mid);cursor:pointer;text-align:left;transition:.2s;line-height:1.45; }
  .opt:hover { border-color:var(--terra-l);color:var(--dark); }
  .opt.sel   { background:rgba(193,122,90,.1);border-color:var(--terra);color:var(--dark); }
  .card-foot { display:flex;justify-content:space-between;align-items:center;margin-top:28px; }
  .btn-back  { background:none;border:none;font-family:'DM Sans',sans-serif;font-size:14px;color:var(--soft);cursor:pointer;transition:.2s; }
  .btn-back:hover { color:var(--mid); }

  .auth-card { background:var(--surface);border-radius:28px;padding:52px 48px;max-width:480px;width:100%;box-shadow:0 24px 64px rgba(44,36,32,.09);position:relative;z-index:5;animation:fadeUp .5s ease both; }
  .auth-title { font-family:'Lora',serif;font-size:30px;color:var(--dark);margin-bottom:6px; }
  .auth-title em { color:var(--terra);font-style:italic; }
  .auth-sub   { font-size:14px;color:var(--soft);margin-bottom:36px;line-height:1.6; }
  .field { display:flex;flex-direction:column;gap:7px;margin-bottom:16px; }
  .field label { font-size:12px;color:var(--mid);font-weight:500;letter-spacing:.3px; }
  .field input { background:var(--cream);border:1.5px solid var(--warm);border-radius:12px;padding:13px 16px;font-family:'DM Sans',sans-serif;font-size:15px;color:var(--dark);outline:none;transition:border-color .2s; }
  .field input:focus { border-color:var(--terra); }
  .field input::placeholder { color:var(--soft); }
  .auth-btn { width:100%;margin-top:8px;font-size:16px;padding:14px;border-radius:14px; }
  .auth-toggle { text-align:center;margin-top:20px;font-size:14px;color:var(--soft); }
  .auth-toggle button { background:none;border:none;color:var(--terra);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;transition:.2s; }
  .auth-toggle button:hover { color:var(--terra-l); }
  .auth-divider { display:flex;align-items:center;gap:12px;margin:20px 0; }
  .auth-divider span { font-size:12px;color:var(--soft); }
  .auth-divider div  { flex:1;height:1px;background:var(--warm); }
  .welcome-box { background:rgba(193,122,90,.07);border-radius:14px;padding:16px 18px;margin-bottom:28px;border:1px solid rgba(193,122,90,.15); }
  .welcome-box p { font-size:13px;color:var(--terra);line-height:1.6; }
  .welcome-box strong { color:var(--dark); }
  .auth-error { background:rgba(193,60,60,.08);border:1px solid rgba(193,60,60,.2);color:#c13c3c;border-radius:10px;padding:10px 14px;font-size:13px;margin-bottom:14px;line-height:1.5; }

  .dashboard { min-height:100vh;padding-top:72px;display:grid;grid-template-columns:260px 1fr;position:relative;align-items:start; }
  .sidebar { background:var(--surface);border-right:1px solid var(--warm);padding:28px 16px;position:sticky;top:72px;height:calc(100vh - 72px);overflow-y:auto;display:flex;flex-direction:column;gap:4px;z-index:5; }
  .sidebar-user { display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid var(--warm);padding-bottom:20px;margin-bottom:20px;cursor:pointer; }
  .sidebar-user:hover .user-name { color:var(--terra); }
  .user-avatar { width:44px;height:44px;border-radius:50%;background:rgba(193,122,90,.15);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;overflow:hidden; }
  .user-avatar img { width:100%;height:100%;object-fit:cover;border-radius:50%; }
  .user-name { font-family:'Lora',serif;font-size:15px;color:var(--dark);transition:.2s; }
  .user-status { font-size:12px;color:var(--green); }
  .nav-section { font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--soft);padding:0 14px;margin:8px 0 6px;font-weight:500; }
  .nav-item { display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:12px;cursor:pointer;transition:.2s;font-size:14px;color:var(--mid); }
  .nav-item:hover  { background:var(--cream);color:var(--dark); }
  .nav-item.active { background:rgba(193,122,90,.1);color:var(--terra); }
  .nav-item .icon  { font-size:18px;width:24px;text-align:center;flex-shrink:0; }
  .nav-badge { margin-left:auto;background:var(--terra);color:var(--on-terra);font-size:10px;font-weight:600;padding:2px 7px;border-radius:100px; }

  .main { padding:40px 52px;min-height:calc(100vh - 72px);overflow-y:auto;position:relative;z-index:5; }
  .panel-title { font-family:'Lora',serif;font-size:32px;color:var(--dark);margin-bottom:6px; }
  .panel-title em { color:var(--terra);font-style:italic; }
  .panel-sub { font-size:15px;color:var(--mid);margin-bottom:36px; }

  .location-banner { display:flex;align-items:center;gap:14px;background:rgba(122,158,126,.1);border:1px solid rgba(122,158,126,.25);border-radius:16px;padding:16px 20px;margin-bottom:24px; }
  .location-banner span { font-size:20px;flex-shrink:0; }
  .location-banner div { flex:1;font-size:13px;color:var(--mid); }
  .location-banner strong { display:block;font-size:14px;color:var(--dark);margin-bottom:2px; }

  .kindreds-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px; }
  .k-card { background:var(--surface);border-radius:22px;padding:28px;box-shadow:0 8px 32px rgba(44,36,32,.07);transition:.25s;animation:fadeUp .5s ease both; }
  .k-card:hover { transform:translateY(-4px);box-shadow:0 16px 44px rgba(44,36,32,.12); }
  .k-card:nth-child(2){animation-delay:.08s} .k-card:nth-child(3){animation-delay:.16s} .k-card:nth-child(4){animation-delay:.24s}
  .k-avatar { width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:14px;overflow:hidden; }
  .k-avatar img { width:100%;height:100%;object-fit:cover;border-radius:50%; }
  .k-name   { font-family:'Lora',serif;font-size:19px;color:var(--dark); }
  .k-age    { font-size:13px;color:var(--soft);margin-bottom:14px; }
  .k-reason { background:rgba(193,122,90,.08);border-radius:10px;padding:10px 12px;font-size:12px;color:var(--terra);line-height:1.55;margin-bottom:14px; }
  .k-reason strong { display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px; }
  .k-compat-label { display:flex;justify-content:space-between;font-size:11px;color:var(--soft);margin-bottom:5px; }
  .k-track  { height:4px;background:var(--warm);border-radius:100px;overflow:hidden; }
  .k-fill   { height:100%;background:var(--green);border-radius:100px; }
  .k-tags { display:flex;flex-wrap:wrap;gap:5px;margin:10px 0; }
  .k-tag { background:rgba(193,122,90,.1);color:var(--terra);border-radius:100px;padding:3px 10px;font-size:11px;font-weight:500; }
  .k-btn    { width:100%;margin-top:16px;background:none;border:1.5px solid var(--warm);color:var(--mid);font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;padding:10px;border-radius:12px;transition:.2s; }
  .k-btn:hover { border-color:var(--terra);color:var(--terra); }

  .convos-layout { display:grid;grid-template-columns:320px 1fr;gap:0;height:calc(100vh - 72px - 80px);border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(44,36,32,.08); }
  .convo-list { background:var(--surface);border-right:1px solid var(--warm);display:flex;flex-direction:column; }
  .convo-list-hdr { padding:20px 20px 16px;border-bottom:1px solid var(--warm); }
  .convo-list-hdr h3 { font-family:'Lora',serif;font-size:18px;color:var(--dark); }
  .convo-list-hdr p  { font-size:12px;color:var(--soft);margin-top:2px; }
  .convo-items { flex:1;overflow-y:auto; }
  .convo-item { display:flex;align-items:center;gap:12px;padding:14px 20px;cursor:pointer;transition:.2s;border-bottom:1px solid var(--line-soft); }
  .convo-item:hover  { background:var(--cream); }
  .convo-item.active { background:rgba(193,122,90,.08); }
  .ci-avatar { width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0; }
  .ci-info   { flex:1;min-width:0; }
  .ci-name   { font-family:'Lora',serif;font-size:15px;color:var(--dark); }
  .ci-last   { font-size:12px;color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;margin-top:2px; }
  .ci-meta   { display:flex;flex-direction:column;align-items:flex-end;gap:4px; }
  .depth-tag { font-size:10px;background:rgba(122,158,126,.15);color:var(--green);padding:2px 8px;border-radius:100px;white-space:nowrap; }
  .ci-dot    { width:8px;height:8px;border-radius:50%;background:var(--terra); }

  .chat-panel { display:flex;flex-direction:column;background:var(--cream); }
  .chat-hdr   { padding:18px 28px;border-bottom:1px solid var(--warm);background:var(--surface);display:flex;align-items:center;gap:14px;flex-shrink:0; }
  .chat-hdr-avatar { width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px; }
  .chat-hdr-name   { font-family:'Lora',serif;font-size:17px;color:var(--dark); }
  .chat-hdr-status { font-size:12px;color:var(--green); }
  .chat-msgs  { flex:1;overflow-y:auto;padding:20px 28px;display:flex;flex-direction:column;gap:14px; }
  .prompt-box { background:rgba(193,122,90,.08);border:1px solid rgba(193,122,90,.2);border-radius:14px;padding:14px 18px;text-align:center;margin-bottom:6px; }
  .prompt-box p     { font-family:'Lora',serif;font-size:14px;color:var(--terra);font-style:italic;line-height:1.5; }
  .prompt-box small { font-size:11px;color:var(--soft);display:block;margin-top:4px; }
  .msg      { display:flex;flex-direction:column;max-width:62%;animation:fadeUp .3s ease both; }
  .msg.sent { align-self:flex-end;align-items:flex-end; }
  .msg.recv { align-self:flex-start; }
  .bubble   { padding:12px 16px;border-radius:18px;font-size:14px;line-height:1.65; }
  .sent .bubble { background:var(--terra);color:var(--on-terra);border-bottom-right-radius:4px; }
  .recv .bubble { background:var(--surface);color:var(--dark);border-bottom-left-radius:4px;box-shadow:0 2px 10px rgba(0,0,0,.06); }
  .msg-time { font-size:10px;color:var(--soft);margin-top:3px;padding:0 4px; }
  .chat-input-area { padding:16px 28px;border-top:1px solid var(--warm);background:var(--surface);display:flex;gap:10px;align-items:flex-end;flex-shrink:0; }
  .c-inp    { flex:1;background:var(--cream);border:1.5px solid var(--warm);border-radius:20px;padding:11px 18px;font-family:'DM Sans',sans-serif;font-size:14px;color:var(--dark);outline:none;resize:none;max-height:100px;transition:border-color .2s; }
  .c-inp:focus { border-color:var(--terra); }
  .c-inp::placeholder { color:var(--soft); }
  .c-send   { width:42px;height:42px;border-radius:50%;background:var(--terra);border:none;color:var(--on-terra);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:.2s; }
  .c-send:hover { background:var(--terra-l);transform:scale(1.05); }
  .empty-chat { flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--soft); }
  .empty-chat span { font-size:40px; }
  .empty-chat p { font-size:14px;text-align:center;max-width:240px;line-height:1.6; }

  .profile-wrap { max-width:680px;margin:0 auto;animation:fadeUp .4s ease both; }
  .profile-hero { background:var(--surface);border-radius:24px;padding:36px;box-shadow:0 8px 32px rgba(44,36,32,.07);margin-bottom:16px;display:flex;gap:32px;align-items:flex-start; }
  .profile-photo-wrap { flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:10px; }
  .profile-photo { width:110px;height:110px;border-radius:50%;background:rgba(193,122,90,.15);display:flex;align-items:center;justify-content:center;font-size:44px;overflow:hidden;border:3px solid var(--warm);cursor:pointer;transition:.2s;position:relative; }
  .profile-photo:hover { border-color:var(--terra); }
  .profile-photo:hover .photo-overlay { opacity:1; }
  .profile-photo img { width:100%;height:100%;object-fit:cover; }
  .photo-overlay { position:absolute;inset:0;border-radius:50%;background:rgba(44,36,32,.45);display:flex;align-items:center;justify-content:center;font-size:22px;opacity:0;transition:.2s; }
  .profile-photo-hint { font-size:11px;color:var(--soft);text-align:center;max-width:90px;line-height:1.4; }
  .profile-section { background:var(--surface);border-radius:20px;padding:28px 32px;box-shadow:0 8px 32px rgba(44,36,32,.07);margin-bottom:12px; }
  .profile-section-title { font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--soft);font-weight:500;margin-bottom:14px; }

  /* Chip selector para relationship/interested */
  .chip-group { display:flex;flex-wrap:wrap;gap:8px; }
  .chip {
    display:inline-flex;align-items:center;gap:6px;
    padding:8px 14px;border-radius:100px;
    border:1.5px solid var(--warm);
    background:var(--cream);
    font-family:'DM Sans',sans-serif;font-size:13px;font-weight:400;
    color:var(--mid);cursor:pointer;
    transition:all .18s ease;
    -webkit-tap-highlight-color:transparent;
    user-select:none;
  }
  .chip:hover { border-color:var(--terra-l);color:var(--dark); }
  .chip.chip-sel {
    background:rgba(193,122,90,.12);
    border-color:var(--terra);
    color:var(--terra);
    font-weight:500;
  }
  .chip .chip-dot {
    width:7px;height:7px;border-radius:50%;
    background:currentColor;opacity:.5;flex-shrink:0;
  }
  .chip.chip-sel .chip-dot { opacity:1; }
  .interests-list { display:flex;flex-wrap:wrap;gap:8px; }
  .interest-tag-edit { background:rgba(193,122,90,.1);color:var(--terra);border-radius:100px;padding:6px 10px 6px 14px;font-size:13px;font-weight:500;display:flex;align-items:center;gap:6px; }
  .interest-tag-edit button { background:none;border:none;color:var(--terra);cursor:pointer;font-size:14px;line-height:1;opacity:.5;padding:0;transition:.2s; }
  .interest-tag-edit button:hover { opacity:1; }
  .interests-input-row { display:flex;gap:8px;margin-top:12px; }
  .btn-add-interest { background:var(--terra);border:none;color:var(--on-terra);font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;padding:0 18px;border-radius:12px;transition:.2s;white-space:nowrap;flex-shrink:0; }
  .btn-add-interest:hover { background:var(--terra-l); }
  .profile-saved-hint { text-align:right;font-size:12px;color:var(--soft);padding:4px 2px; }
  .inline-field-label { font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--soft);font-weight:500;margin-bottom:6px; }
  .inline-input { width:100%;background:var(--cream);border:1.5px solid var(--warm);border-radius:12px;padding:10px 14px;font-family:'DM Sans',sans-serif;font-size:14px;color:var(--dark);outline:none;transition:border-color .2s;resize:none; }
  .inline-input:focus { border-color:var(--terra); }
  .inline-input::placeholder { color:var(--soft); }
  .inline-input-lg { font-family:'Lora',serif;font-size:20px;font-weight:600; }
  .inline-textarea { line-height:1.6;min-height:80px; }

  /* ── MOBILE CHAT OVERLAY control ─── */
  /* Desktop: hide mobile overlay, show inline chat */
  .chat-panel-mobile-overlay { display:none; }

  @media (max-width: 768px) {
    /* Mobile: show overlay when chat is open, hide the inline convos-layout */
    .chat-panel-mobile-overlay { display:flex; }
    /* Hide the desktop inline chat panel on mobile (the convo list stays, overlay takes over) */
    .convos-layout .chat-panel { display:none !important; }
    /* When chat overlay is open, also hide the convo list header + list */
    .convos-layout { border-radius:0;box-shadow:none; }
  }

  @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideInRight{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}
  @keyframes slideInUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}

  /* ── BOTTOM TAB BAR (mobile only) ─────────────────────────────── */
  .bottom-nav {
    display:none;
    position:fixed;bottom:0;left:0;right:0;z-index:150;
    background:rgba(252,248,242,.97);
    backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);
    border-top:1px solid var(--line-soft);
    padding:0;
    padding-bottom:env(safe-area-inset-bottom,0);
    box-shadow:0 -1px 0 var(--line-soft), 0 -12px 40px rgba(44,36,32,.07);
  }
  .bottom-nav-inner {
    display:flex;align-items:stretch;
    height:62px;
    max-width:500px;margin:0 auto;
    padding:0 8px;
  }
  .bottom-tab {
    flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:4px;cursor:pointer;position:relative;
    border:none;background:none;padding:6px 4px 4px;
    -webkit-tap-highlight-color:transparent;
    transition:transform .15s ease;
  }
  .bottom-tab:active { transform:scale(.92); }
  .bottom-tab .tab-icon-wrap {
    position:relative;
    width:44px;height:28px;
    display:flex;align-items:center;justify-content:center;
    border-radius:14px;
    transition:background .2s ease;
  }
  .bottom-tab.active .tab-icon-wrap {
    background:rgba(193,122,90,.13);
  }
  .bottom-tab .tab-icon {
    font-size:19px;line-height:1;
    transition:transform .2s cubic-bezier(.34,1.56,.64,1);
    display:block;
  }
  .bottom-tab.active .tab-icon { transform:scale(1.15); }
  .bottom-tab .tab-label {
    font-family:'DM Sans',sans-serif;
    font-size:10px;font-weight:400;
    color:var(--soft);
    letter-spacing:.2px;
    line-height:1;
    transition:color .2s,font-weight .2s;
  }
  .bottom-tab.active .tab-label {
    color:var(--terra);font-weight:600;
  }
  .bottom-tab .tab-badge {
    position:absolute;top:2px;right:4px;
    background:var(--terra);color:var(--on-terra);
    font-size:9px;font-weight:700;
    min-width:17px;height:17px;border-radius:100px;
    display:flex;align-items:center;justify-content:center;
    padding:0 4px;
    border:2px solid rgba(252,248,242,.97);
    line-height:1;
  }

  /* ── MOBILE DASHBOARD LAYOUT ───────────────────────────────────── */
  @media (max-width: 768px) {
    /* Hide desktop nav items, show compact nav */
    .nav-inner { padding:14px 20px; }
    .nav-r .btn-ghost, .nav-r .btn-pill { font-size:13px;padding:8px 14px; }

    /* Dashboard: single column, sidebar hidden */
    .dashboard { grid-template-columns:1fr !important;padding-top:58px; }
    .sidebar { display:none !important; }
    .bottom-nav { display:flex; }

    /* Main panel padded for bottom bar */
    .main {
      padding:20px 16px 80px !important;
      min-height:calc(100vh - 58px);
    }

    /* Landing hero adjustments */
    .hero-content { padding:0 20px; }
    .h1 { font-size:clamp(36px,9vw,52px);letter-spacing:-1.5px; }
    .hero-p { font-size:15px;margin-bottom:28px; }
    .cta-row { flex-direction:column;align-items:center;gap:10px;margin-bottom:40px; }
    .btn-big { width:100%;max-width:280px;font-size:15px; }
    .btn-outline { width:100%;max-width:280px;font-size:15px; }
    .feats { gap:16px;padding:0 20px 60px; }
    .feat { font-size:13px; }

    /* Onboarding / Auth cards */
    .card { padding:28px 20px;border-radius:20px; }
    .auth-card { padding:32px 20px;border-radius:20px; }
    .q-text { font-size:22px; }
    .opts { grid-template-columns:1fr; }

    /* Panel titles */
    .panel-title { font-size:24px;margin-bottom:4px; }
    .panel-sub { font-size:13px;margin-bottom:20px; }

    /* Kindreds grid: single column on mobile */
    .kindreds-grid { grid-template-columns:1fr !important;gap:14px; }
    .k-card { padding:20px; }

    /* Conversations: full screen list or full screen chat */
    .convos-layout {
      grid-template-columns:1fr !important;
      height:auto !important;
      border-radius:16px;
      gap:0;
    }
    .convo-list { border-right:none;border-bottom:1px solid var(--warm); }

    /* Full screen chat overlay on mobile */
    .chat-panel-mobile-overlay {
      position:fixed;inset:0;z-index:120;
      background:var(--cream);
      display:flex;flex-direction:column;
      animation:slideInRight .25s ease both;
      padding-bottom:env(safe-area-inset-bottom,0);
    }
    .chat-mobile-back {
      display:flex;align-items:center;gap:10px;
      padding:12px 16px;background:var(--surface);
      border-bottom:1px solid var(--warm);
      flex-shrink:0;
    }
    .chat-mobile-back button {
      background:none;border:none;
      font-size:22px;cursor:pointer;
      color:var(--terra);padding:4px;
      display:flex;align-items:center;
    }
    .chat-mobile-back .chat-hdr-name { font-size:16px; }
    .chat-mobile-back .chat-hdr-status { font-size:11px; }

    /* Profile panel mobile */
    .profile-hero { flex-direction:column;gap:20px;padding:24px 20px;align-items:center;text-align:center; }
    .profile-photo-wrap { align-items:center; }
    .profile-section { padding:20px 16px; }

    /* Demo modal mobile */
    .demo-modal { grid-template-columns:1fr !important;max-height:95vh; }
    .demo-left { display:none; }
    .demo-right { border-radius:28px; }

    /* Location banner */
    .location-banner { padding:12px 14px; }
  }

  /* ── Test de afinidad ───────────────────────────────────────────── */
  .tm-box { background:var(--surface);border-radius:24px;padding:32px 30px;width:100%;max-width:480px;position:relative;box-shadow:0 24px 70px rgba(44,36,32,.25); }
  .tm-close { position:absolute;top:14px;right:16px;background:none;border:none;font-size:20px;color:var(--soft);cursor:pointer; }
  .tm-label { font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--soft);margin-bottom:10px; }
  .tm-q { font-family:'Lora',serif;font-size:21px;line-height:1.3;color:var(--dark);margin-bottom:18px; }
  .tm-compat { margin-bottom:20px; }
  .tm-compat-top { display:flex;justify-content:space-between;font-size:12px;color:var(--soft);margin-bottom:6px; }
  .tm-track { height:6px;background:var(--warm);border-radius:100px;overflow:hidden; }
  .tm-fill { height:100%;background:var(--terra);border-radius:100px;transition:width .5s ease; }
  .tm-fill.ok { background:var(--green); }
  .tm-result { text-align:center;padding:8px 0 4px; }
  .tm-result h3 { font-family:'Lora',serif;font-size:24px;color:var(--dark);margin-bottom:10px; }
  .tm-result p { font-size:14px;color:var(--mid);line-height:1.6;margin-bottom:20px; }

  /* ── Test de personalidad (OCEAN) ───────────────────────────────── */
  .tp-card { background:var(--surface);border:1px solid var(--warm);border-radius:24px;padding:36px;max-width:660px;box-shadow:0 8px 30px rgba(44,36,32,.05);animation:fadeUp .4s ease both; }
  .tp-eyebrow { font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--soft);margin-bottom:14px;font-weight:500; }
  .tp-big-icon { width:64px;height:64px;border-radius:20px;background:rgba(193,122,90,.12);display:flex;align-items:center;justify-content:center;font-size:32px;margin-bottom:18px; }
  .tp-title { font-family:'Lora',serif;font-size:28px;line-height:1.25;color:var(--dark);margin-bottom:12px; }
  .tp-text { font-size:15px;line-height:1.65;color:var(--mid);margin-bottom:18px; }
  .tp-box { background:var(--cream);border-radius:16px;padding:16px 18px;margin-bottom:14px; }
  .tp-box strong { display:block;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--terra);margin-bottom:6px;font-weight:600; }
  .tp-box p { font-size:14px;line-height:1.6;color:var(--mid); }
  .tp-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px;margin-bottom:24px; }
  .tp-mini { background:var(--surface);border:1px solid var(--warm);border-radius:18px;padding:18px; }
  .tp-mini .tp-mini-icon { font-size:24px;margin-bottom:8px; }
  .tp-mini h4 { font-family:'Lora',serif;font-size:16px;color:var(--dark);margin-bottom:4px; }
  .tp-mini p { font-size:13px;line-height:1.5;color:var(--mid); }
  .tp-opts { display:flex;flex-direction:column;gap:8px;margin:20px 0 24px; }
  .tp-foot { display:flex;justify-content:space-between;align-items:center;gap:12px; }
  .tp-res-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;margin:24px 0; }
  .tp-res { background:var(--surface);border:1px solid var(--warm);border-radius:20px;padding:22px; }
  .tp-res-head { display:flex;align-items:center;gap:12px;margin-bottom:14px; }
  .tp-res-head .tp-res-icon { width:42px;height:42px;border-radius:14px;background:rgba(193,122,90,.12);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0; }
  .tp-res-name { font-family:'Lora',serif;font-size:17px;color:var(--dark); }
  .tp-res-level { font-size:12px;color:var(--soft); }
  .tp-res-score { margin-left:auto;font-family:'Lora',serif;font-size:26px;color:var(--terra); }
  .tp-bar { height:7px;background:var(--warm);border-radius:100px;overflow:hidden;margin-bottom:14px; }
  .tp-bar > div { height:100%;background:var(--terra);border-radius:100px;transition:width .8s ease; }
  .tp-res p { font-size:13.5px;line-height:1.6;color:var(--mid); }
  .tp-note { font-size:12px;color:var(--soft);line-height:1.6;max-width:660px; }
  @media (max-width:768px) {
    .tp-card { padding:24px 20px;border-radius:20px; }
    .tp-title { font-size:23px; }
    .tp-res-grid { grid-template-columns:1fr; }
  }

  /* ── Guía de bienvenida ─────────────────────────────────────────── */
  @keyframes tourGrow { from { transform:scaleX(0); } }
  @keyframes tourPop  { from { opacity:0;transform:translateY(10px) scale(.98); } }
  .tour-card { background:var(--surface);border-radius:28px;width:100%;max-width:560px;max-height:92vh;overflow-y:auto;padding:26px 28px 24px;box-shadow:0 30px 80px rgba(0,0,0,.3);border:1px solid var(--line-soft); }
  .tour-top { display:flex;align-items:center;justify-content:space-between;margin-bottom:22px; }
  .tour-dots { display:flex;gap:7px; }
  .tour-dot { width:8px;height:8px;border-radius:100px;border:none;background:var(--warm);cursor:pointer;padding:0;transition:.3s; }
  .tour-dot.on { width:26px;background:var(--terra); }
  .tour-dot.done { background:var(--terra);opacity:.45; }
  .tour-skip { background:none;border:none;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--soft);cursor:pointer;padding:6px 4px; }
  .tour-skip:hover { color:var(--mid); }
  .tour-body { animation:tourPop .35s ease both; }
  .tour-eyebrow { display:flex;align-items:center;gap:10px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--soft);font-weight:500;margin-bottom:10px; }
  .tour-eyebrow span { font-size:22px;letter-spacing:0; }
  .tour-title { font-family:'Lora',serif;font-size:26px;line-height:1.25;color:var(--dark);margin-bottom:10px; }
  .tour-text { font-size:15px;line-height:1.65;color:var(--mid);margin-bottom:18px; }
  .tour-visual { background:var(--cream);border:1px solid var(--line-soft);border-radius:20px;padding:18px;margin-bottom:12px; }
  .tour-legend { display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--mid);margin-bottom:6px; }
  .tour-legend b { display:inline-flex;width:20px;height:20px;border-radius:50%;background:var(--terra);color:var(--on-terra);font-size:11px;align-items:center;justify-content:center;margin-right:8px;font-weight:600; }
  .tour-tip { font-size:13px;color:var(--soft);line-height:1.5;margin-bottom:6px; }
  .tour-foot { display:flex;justify-content:space-between;align-items:center;margin-top:18px; }
  .tv-nav { display:flex;flex-direction:column;gap:6px; }
  .tv-nav div { display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;font-size:14px;color:var(--mid);background:var(--surface); }
  .tv-nav div.on { background:rgba(193,122,90,.14);color:var(--terra); }
  .tv-nav small { margin-left:auto;font-size:11px;color:var(--soft); }
  .tv-trait { display:grid;grid-template-columns:22px 1fr 34px;align-items:center;gap:10px;margin-bottom:9px;font-size:12px;color:var(--mid); }
  .tv-trait:last-child { margin-bottom:0; }
  .tv-track { height:8px;background:var(--warm);border-radius:100px;overflow:hidden; }
  .tv-track div { height:100%;background:var(--terra);border-radius:100px;transform-origin:left;animation:tourGrow .9s ease both; }
  .tv-card { background:var(--surface);border:1px solid var(--line-soft);border-radius:18px;padding:16px;max-width:290px;margin:0 auto; }
  .tv-row { display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12.5px;color:var(--mid);margin-bottom:8px; }
  .tv-pin { width:18px;height:18px;border-radius:50%;background:var(--terra);color:var(--on-terra);font-size:10px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0; }
  .tv-avatar { width:42px;height:42px;border-radius:50%;background:rgba(193,122,90,.14);display:flex;align-items:center;justify-content:center;font-size:20px;margin-bottom:8px; }
  .tv-btn { width:100%;margin-top:10px;background:var(--terra);color:var(--on-terra);border:none;border-radius:100px;padding:9px;font-size:13px;font-weight:500;font-family:'DM Sans',sans-serif; }
  .tv-bar-wrap { position:relative;margin:6px 0 16px; }
  .tv-mark { position:absolute;top:-4px;width:2px;height:16px;background:var(--dark);opacity:.5;border-radius:2px; }
  .tv-mark span { position:absolute;top:18px;left:50%;transform:translateX(-50%);font-size:10px;color:var(--soft);white-space:nowrap; }
  .tv-opt { background:var(--surface);border:1.5px solid var(--warm);border-radius:12px;padding:10px 12px;font-size:13px;color:var(--mid);margin-bottom:7px; }
  .tv-opt.sel { border-color:var(--terra);background:rgba(193,122,90,.12);color:var(--dark); }
  .tv-bub { max-width:82%;padding:10px 13px;border-radius:16px;font-size:13px;line-height:1.5;margin-bottom:8px; }
  .tv-bub.recv { background:var(--surface);border:1px solid var(--line-soft);color:var(--dark);border-bottom-left-radius:4px; }
  .tv-bub.sent { background:var(--terra);color:var(--on-terra);margin-left:auto;border-bottom-right-radius:4px; }
  .tv-topic { background:var(--surface);border:1px dashed var(--terra);border-radius:16px;padding:12px 14px;margin:4px 0 0; }
  .tv-topic small { display:block;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--terra);margin-bottom:5px;font-weight:600; }
  .tv-topic p { font-size:13px;color:var(--dark);line-height:1.5;margin-bottom:10px; }
  .tv-topic div { display:flex;gap:8px; }
  .tv-topic span { font-size:12px;padding:6px 14px;border-radius:100px;border:1px solid var(--line-strong);color:var(--mid); }
  .tv-topic span.ok { background:var(--terra);border-color:var(--terra);color:var(--on-terra); }
  .tv-switch-row { display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--surface);border-radius:14px;padding:14px 16px; }
  .tv-switch-row strong { display:block;font-size:14px;color:var(--dark);font-weight:500; }
  .tv-switch-row small { font-size:12px;color:var(--soft); }
  .tv-switch { width:52px;height:30px;border-radius:100px;border:none;background:var(--warm);position:relative;cursor:pointer;transition:.3s;flex-shrink:0; }
  .tv-switch::after { content:"";position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:var(--surface);box-shadow:0 2px 6px rgba(0,0,0,.25);transition:.3s; }
  .tv-switch[aria-checked="true"] { background:var(--terra); }
  .tv-switch[aria-checked="true"]::after { transform:translateX(22px); }
  .tv-switch:focus-visible { outline:2px solid var(--terra);outline-offset:3px; }
  @media (prefers-reduced-motion: reduce) { .tour-card *, .tv-track div { animation:none !important;transition:none !important; } }
  @media (max-width:768px) { .tour-card { padding:20px 18px;border-radius:22px; } .tour-title { font-size:22px; } }

  /* ── Conversaciones en una sola pantalla (sin scroll de página) ──── */
  .convos-layout > * { min-height:0; }
  .convo-list { min-height:0; }
  @media (min-width:769px) {
    .main.main-fit { height:calc(100vh - 72px);min-height:0;overflow:hidden;display:flex;flex-direction:column;padding:28px 52px 32px; }
    .main.main-fit .panel-title { font-size:26px;margin-bottom:2px; }
    .main.main-fit .panel-sub { font-size:14px;margin-bottom:16px; }
    .main.main-fit .convos-layout { flex:1;min-height:0;height:auto; }
  }

  /* ── Ruleta Kindred ─────────────────────────────────────────────── */
  @keyframes rlPulse { 0%,100% { box-shadow:0 0 0 0 rgba(193,122,90,.35); } 50% { box-shadow:0 0 0 12px rgba(193,122,90,0); } }
  .rl-pane { overflow-y:auto; }
  .rl { flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:18px 24px;text-align:center;--wheel:min(236px,30vh); }
  .rl-eyebrow { font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--terra);font-weight:600; }
  .rl-title { font-family:'Lora',serif;font-size:24px;line-height:1.25;color:var(--dark); }
  .rl-text { font-size:13.5px;line-height:1.55;color:var(--mid);max-width:380px; }
  .rl-testtag { font-size:11.5px;color:var(--soft);background:var(--cream);border:1px dashed var(--line-strong);border-radius:100px;padding:4px 12px; }
  .rl-stage { position:relative;width:var(--wheel);height:var(--wheel);margin:4px 0; }
  .rl-pointer { position:absolute;top:-10px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:11px solid transparent;border-right:11px solid transparent;border-top:20px solid var(--terra);z-index:3;filter:drop-shadow(0 2px 3px rgba(0,0,0,.25)); }
  .rl-wheel { position:relative;width:100%;height:100%;border-radius:50%;border:4px solid var(--terra);box-shadow:0 10px 30px rgba(44,36,32,.18);transition:transform 4s cubic-bezier(.12,.7,.1,1); }
  .rl-wheel.idle { animation:rlPulse 2.4s ease infinite; }
  .rl-label { position:absolute;top:50%;left:50%;width:0;height:0;display:flex;align-items:center;justify-content:center;font-size:22px; }
  .rl-hub { position:absolute;top:50%;left:50%;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:var(--surface);border:3px solid var(--terra);display:flex;align-items:center;justify-content:center;font-size:18px;z-index:2; }
  .rl-result { background:var(--cream);border:1px solid var(--line-strong);border-radius:18px;padding:14px 18px;width:100%;max-width:330px;animation:fadeUp .4s ease both; }
  .rl-result strong { display:block;font-family:'Lora',serif;font-size:17px;color:var(--dark);margin-bottom:4px; }
  .rl-result small { display:block;font-size:12.5px;color:var(--mid);margin-bottom:8px; }
  .rl-bar { height:6px;background:var(--warm);border-radius:100px;overflow:hidden;margin-bottom:12px; }
  .rl-bar div { height:100%;background:var(--terra);border-radius:100px; }
  .rl-actions { display:flex;gap:8px;justify-content:center;flex-wrap:wrap; }
  .rl-ghost { background:none;border:1px solid var(--line-strong);color:var(--mid);border-radius:100px;padding:10px 18px;font-family:'DM Sans',sans-serif;font-size:13.5px;cursor:pointer; }
  .rl-ghost:hover { border-color:var(--terra);color:var(--terra); }
  @media (prefers-reduced-motion: reduce) { .rl-wheel { transition-duration:.01s; } .rl-wheel.idle { animation:none; } }
  @media (max-width:768px) {
    .convos-layout .chat-panel.rl-pane { display:flex !important;order:-1;border-bottom:1px solid var(--warm); }
    .rl { --wheel:200px;padding:20px 16px; }
    .rl-entry { display:none; }
  }

  /* ── Revelación: foto + ✕ / ✓ antes de conversar ─────────────────── */
  @keyframes revealIn { from { opacity:0;transform:scale(.92); } }
  .tm-reveal { text-align:center;animation:revealIn .45s cubic-bezier(.2,.8,.2,1) both; }
  .tm-reveal-eyebrow { font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--green);font-weight:600;margin-bottom:14px; }
  .tm-photo { width:132px;height:132px;border-radius:50%;margin:0 auto 14px;overflow:hidden;border:4px solid var(--terra);box-shadow:0 10px 30px rgba(44,36,32,.22);display:flex;align-items:center;justify-content:center;font-size:56px; }
  .tm-photo img { width:100%;height:100%;object-fit:cover; }
  .tm-reveal h3 { font-family:'Lora',serif;font-size:24px;color:var(--dark);margin-bottom:4px; }
  .tm-reveal p { font-size:14px;color:var(--mid);line-height:1.55;margin-bottom:18px; }
  .tm-choice { display:flex;justify-content:center;gap:28px;margin-bottom:10px; }
  .tm-choice button { width:68px;height:68px;border-radius:50%;font-size:30px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.2s;font-family:'DM Sans',sans-serif; }
  .tm-choice button:hover { transform:translateY(-3px) scale(1.05); }
  .tm-choice button:focus-visible { outline:3px solid var(--terra);outline-offset:3px; }
  .tm-no  { background:var(--surface);border:2px solid var(--line-strong);color:#d9534f; }
  .tm-no:hover { border-color:#d9534f; }
  .tm-yes { background:var(--green);border:2px solid var(--green);color:#fff;box-shadow:0 8px 22px rgba(122,158,126,.45); }
  .tm-hint { font-size:12px;color:var(--soft); }
  .rl-notice { font-size:13px;color:var(--terra);background:rgba(193,122,90,.1);border-radius:100px;padding:6px 14px; }

  /* ── Match mutuo: avisos y listas ───────────────────────────────── */
  .toast-wrap { position:fixed;left:0;right:0;bottom:28px;display:flex;justify-content:center;z-index:400;pointer-events:none;padding:0 16px; }
  .toast { background:var(--dark);color:var(--cream);padding:12px 22px;border-radius:100px;font-size:14px;box-shadow:0 12px 36px rgba(0,0,0,.28);animation:fadeUp .35s ease both;max-width:520px;text-align:center;line-height:1.4; }
  .cl-section { padding:12px 20px 6px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--soft);font-weight:600; }
  .cl-pending { opacity:.7;cursor:default; }
  @media (max-width:768px) { .toast-wrap { bottom:88px; } }

  /* ── TABLET adjustments ─────────────────────────────────────────── */
  @media (min-width: 769px) and (max-width: 1024px) {
    .dashboard { grid-template-columns:220px 1fr; }
    .main { padding:28px 32px; }
    .kindreds-grid { grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); }
    .convos-layout { grid-template-columns:260px 1fr; }
  }
`;


// ─── Datos demo ───────────────────────────────────────────────────────────────
const QUESTIONS = [
  { id:1, type:"options", label:"Sobre ti",   question:"¿Qué haces cuando no puedes dormir?",              options:["📖 Leo o escucho algo hasta dormirme","🌀 Le doy vueltas a mis pensamientos","📱 Reviso el teléfono sin parar","🚶 Me levanto a caminar o hacer algo"] },
  { id:2, type:"options", label:"Tu mundo",   question:"¿Cómo te sientes en una reunión donde no conoces a nadie?", options:["😶 Espero a que alguien me hable","🗣️ Me presento sin pensarlo","👀 Observo antes de participar","📱 Reviso el teléfono hasta sentirme cómodo/a"] },
  { id:3, type:"options", label:"Intereses",  question:"¿De qué podrías hablar horas sin cansarte?",       options:["🌌 Ideas, teorías, el sentido de la vida","🎬 Historias, películas, series","😂 Anécdotas y chismes del día a día","🎯 Proyectos y metas personales"] },
  { id:4, type:"options", label:"Valores",    question:"En una relación, ¿qué valoras más?",               options:["🧠 Conversaciones profundas","😂 Reírnos juntos de todo","🤝 Que me dejen ser yo mismo/a","🌱 Crecer juntos con el tiempo"] },
  { id:5, type:"options", label:"Honestidad", question:"¿Qué hace que alguien te caiga bien de verdad?",   options:["👂 Que escuche de verdad","😄 Que me haga reír","🙌 Que sea honesto/a aunque incomode","🧩 Que tenga curiosidad genuina"] },
];

const DEMO_MATCHES = [
  { id:1, name:"Valentina", age:24, ocean_o:66, ocean_c:42, ocean_e:36, ocean_a:62, ocean_n:62, avatar:"🌿", bg:"#E8F4E8", reason:"Los dos son noctámbulos curiosos que hablan solos cuando piensan", compat:87, msgs:[{id:1,type:"recv",text:"Las mejores cosas pasan cuando no las planeas.",time:"10:24"}], depth:"Nivel 2", unread:true },
  { id:2, name:"Sofía",     age:22, ocean_o:74, ocean_c:36, ocean_e:32, ocean_a:70, ocean_n:68, avatar:"🎵", bg:"#F4EEE8", reason:"Ambas valoran las conversaciones profundas sobre las superficiales",   compat:82, msgs:[{id:1,type:"recv",text:"¿Cuál fue el último libro que te cambió algo?",time:"Ayer"}],  depth:"Nivel 1", unread:true },
  { id:3, name:"Camila",    age:25, ocean_o:70, ocean_c:72, ocean_e:24, ocean_a:60, ocean_n:74, avatar:"🌙", bg:"#EEE8F4", reason:"Comparten esa sensación de observar antes de participar en grupos",    compat:79, msgs:[], depth:"Nuevo", unread:false },
  { id:4, name:"Isidora",   age:23, ocean_o:72, ocean_c:74, ocean_e:20, ocean_a:70, ocean_n:24, avatar:"☕", bg:"#F4F0E8", reason:"Las dos prefieren una conversación lenta a un montón de mensajes rápidos", compat:76, msgs:[], depth:"Nuevo", unread:false },
];

// Match hardcodeado SOLO para probar el chat (poner SHOW_TEST_MATCH en false para quitarlo)
const SHOW_TEST_MATCH = true;
const TEST_MATCH = {
  id:"test-match", matchId:null, name:"Valentina (prueba)", avatar:"🌿", bg:"#E8F4E8", depth:"Chat de prueba",
  msgs:[{ id:1, type:"recv", text:"¡Hola! Este es un chat de prueba para ver cómo se ve la conversación 🌿", time:"10:24" }],
};
const TEST_REPLIES = [
  "Qué buena pregunta, déjame pensarlo 🤔",
  "Jaja me pasa lo mismo, cuéntame más",
  "Eso me dice mucho de ti 🌿",
  "¿Y cómo fue eso para ti?",
];

// Compatibilidad con soporte para personas de prueba: si traen forceCompat, ese valor manda
const compatOf = (a, b) => b?.forceCompat ?? getCompatibility(a, b);

// Fran: persona de prueba hardcodeada, SIEMPRE afín a ti (~98%), para poder probar
// Kindreds → ruleta → test de afinidad → chat sin tener gente real cerca.
// Ponlo en false para producción.
const SHOW_FRAN = true;
const TEST_AUTO_ACCEPT_MS = 3000;   // en modo prueba, la persona de ejemplo "te acepta de vuelta" a los 3 s
const FRAN_PHOTO = "data:image/svg+xml;utf8," + encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>" +
  "<stop offset='0' stop-color='#F9D5DD'/><stop offset='1' stop-color='#F0A9BC'/></linearGradient></defs>" +
  "<rect width='200' height='200' fill='url(#g)'/><path d='M36 200c0-44 28-66 64-66s64 22 64 66z' fill='#C17A5A'/>" +
  "<circle cx='100' cy='90' r='37' fill='#F2C9A8'/>" +
  "<path d='M60 94c-6-42 22-62 48-58 32 4 42 30 30 64-6-22-16-32-36-34-20 2-34 10-42 28z' fill='#4A2F26'/>" +
  "<circle cx='87' cy='95' r='3.2' fill='#4A2F26'/><circle cx='113' cy='95' r='3.2' fill='#4A2F26'/>" +
  "<path d='M90 111q10 9 20 0' stroke='#B5604A' stroke-width='3' fill='none' stroke-linecap='round'/></svg>"
);
const clamp100 = (n) => Math.max(0, Math.min(100, Math.round(n)));
function makeFran(me) {
  return {
    id: 99, name: "Fran", avatar: "🌷", avatar_url: FRAN_PHOTO, bg: "#FBE9EE", depth: "Nueva conexión",
    age: me.age || 24, distance_km: 1, compat: 98, forceCompat: 98, unread: false,
    // Sus rasgos salen de los tuyos con una diferencia mínima: la afinidad es alta sea cual sea tu perfil
    ocean_o: clamp100(me.ocean_o + 2), ocean_c: clamp100(me.ocean_c - 2), ocean_e: clamp100(me.ocean_e + 1),
    ocean_a: clamp100(me.ocean_a - 2), ocean_n: clamp100(me.ocean_n + 2),
    reason: "Piensan parecido: les gusta ir profundo y sin apuro",
    msgs: [{ id:1, type:"recv", text:"¡Hola! Soy la Fran 🌷 Qué bueno que la ruleta nos juntó", time:"10:30" }],
  };
}

const DEMO_SCRIPT = [
  { type:"recv", text:"¿Qué harías si tuvieras un día completamente libre, sin planes ni obligaciones?", delay:500 },
  { type:"sent", text:"Empezaría caminando sin rumbo. Las mejores cosas que me han pasado fueron cuando no las planeé.", delay:2000 },
  { type:"recv", text:"Eso me dice mucho de ti 🌿 La mente necesita ese espacio sin agenda para encontrar lo que realmente quiere.", delay:2600 },
  { type:"sent", text:"Exacto. Cuando tengo todo planificado siento que estoy cumpliendo tareas, no viviendo.", delay:2200 },
  { type:"recv", text:"¿Y cuándo fue la última vez que te perdiste así, sin rumbo?", delay:1800 },
];

// ─── Ruleta Kindred: el azar te conecta con alguien afín ─────────────────────
const RL_EMOJIS   = ["🌱","🌿","🍃","🌸","🌼","🌙","⭐","🔥"];
const RL_COLORS   = ["rgba(193,122,90,.30)","rgba(122,158,126,.30)","rgba(226,190,110,.30)"];
const RL_SEGMENTS = 8;

function KindredRoulette({ candidates, me, onConnect, onGoTest, testMode, excludeIds = [], initialNotice = "", onNoticeShown }) {
  const [rot, setRot]           = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult]     = useState(null);
  const [notice, setNotice] = useState(initialNotice);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (initialNotice) onNoticeShown?.(); }, []);

  // Solo entran personas con afinidad suficiente (y no las que ya descartaste, si queda alguien más)
  const eligible = candidates
    .map(person => ({ person, compat: compatOf(me, person) ?? person.compat ?? 0 }))
    .filter(x => x.compat >= COMPAT_THRESHOLD);
  const fresh = eligible.filter(x => !excludeIds.includes(x.person.id));
  const pool  = fresh.length ? fresh : eligible;

  const seg  = 360 / RL_SEGMENTS;
  const segs = pool.length ? Array.from({ length: RL_SEGMENTS }, (_, i) => pool[i % pool.length]) : [];

  const spin = () => {
    if (spinning || pool.length === 0) return;
    // Azar con peso: a mayor afinidad, más probabilidad de salir
    const weights = pool.map(x => x.compat * x.compat);
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    let wi = 0;
    for (; wi < pool.length - 1; wi++) { r -= weights[wi]; if (r <= 0) break; }
    const idxs = segs.map((x, i) => (x === pool[wi] ? i : -1)).filter(i => i >= 0);
    const idx  = idxs[Math.floor(Math.random() * idxs.length)];
    const jitter  = (Math.random() - 0.5) * seg * 0.6;
    const target  = 360 - (idx * seg + seg / 2) + jitter;
    const current = ((rot % 360) + 360) % 360;
    const delta   = (((target - current) % 360) + 360) % 360;

    setResult(null);
    setNotice("");
    setSpinning(true);
    setRot(rot + 360 * 5 + delta);
    timer.current = setTimeout(() => {
      setSpinning(false);
      setResult({ ...pool[wi], emoji: RL_EMOJIS[idx] });
    }, 4200);
  };

  return (
    <div className="rl">
      <div className="rl-eyebrow">🎡 Ruleta Kindred</div>
      <h3 className="rl-title">Deja que el azar te conecte</h3>
      {notice && <div className="rl-notice" role="status">{notice}</div>}
      {testMode && <div className="rl-testtag">🧪 Modo prueba: incluye a Fran, afín a ti</div>}

      {pool.length === 0 ? (
        <>
          <p className="rl-text">Todavía no hay personas con afinidad suficiente cerca de ti. Afina tu perfil con el test y vuelve a intentarlo.</p>
          <button className="btn-pill" onClick={onGoTest}>Hacer el test 🧠</button>
        </>
      ) : (
        <>
          <p className="rl-text">
            Es un juego: gira la ruleta y el azar elige a alguien cerca de ti con quien tengas afinidad ({COMPAT_THRESHOLD}% o más).
            Después responden unas preguntas juntos para confirmar.
          </p>

          <div className="rl-stage">
            <div className="rl-pointer"/>
            <div
              className={`rl-wheel ${!spinning && !result ? "idle" : ""}`}
              style={{
                transform:`rotate(${rot}deg)`,
                background:`conic-gradient(${segs.map((_, i) => `${RL_COLORS[i % RL_COLORS.length]} ${i * seg}deg ${(i + 1) * seg}deg`).join(",")})`,
              }}
              aria-hidden="true"
            >
              {segs.map((_, i) => (
                <div key={i} className="rl-label" style={{ transform:`rotate(${i * seg + seg / 2}deg) translateY(calc(var(--wheel) * -0.34))` }}>
                  {RL_EMOJIS[i % RL_EMOJIS.length]}
                </div>
              ))}
            </div>
            <div className="rl-hub">✦</div>
          </div>

          <div aria-live="polite" style={{width:"100%",display:"flex",justifyContent:"center"}}>
            {result && (
              <div className="rl-result">
                <strong>{result.emoji} ¡El azar eligió por ti!</strong>
                <small>
                  Afinidad {result.compat}%
                  {result.person.distance_km != null ? ` · 📍 ${result.person.distance_km < 1 ? "< 1 km" : `${result.person.distance_km} km`}` : ""}
                  {result.person.age ? ` · ${result.person.age} años` : ""}
                </small>
                <div className="rl-bar"><div style={{width:`${result.compat}%`}}/></div>
                <div className="rl-actions">
                  <button className="btn-pill" onClick={() => onConnect(result.person, "roulette")}>Conectar →</button>
                  <button className="rl-ghost" onClick={spin}>Girar otra vez</button>
                </div>
              </div>
            )}
          </div>

          {!result && (
            <button className="btn-pill" onClick={spin} disabled={spinning}>
              {spinning ? "Girando…" : "Girar la ruleta 🎲"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Guía de bienvenida (después de registrarse) ─────────────────────────────
const TOUR_LEN = 6;

function WelcomeTour({ name, theme, onToggleTheme, onClose }) {
  const [i, setI] = useState(0);
  const first = (name || "").trim().split(" ")[0];

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") setI(n => Math.min(n + 1, TOUR_LEN - 1));
      if (e.key === "ArrowLeft")  setI(n => Math.max(n - 1, 0));
      if (e.key === "Escape")     onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const steps = [
    {
      icon:"👋", eyebrow:"Bienvenida",
      title: first ? `Hola, ${first}. Así funciona Kindred` : "Así funciona Kindred",
      text:"Aquí las personas se conocen por cómo piensan, no por cómo se ven. En un minuto te mostramos lo que vas a usar.",
      visual:(
        <div className="tv-nav">
          <div className="on"><span>✨</span> Kindreds <small>personas afines</small></div>
          <div><span>💬</span> Conversaciones <small>tus chats</small></div>
          <div><span>🧠</span> Test <small>tu personalidad</small></div>
          <div><span>👤</span> Tú <small>tu perfil</small></div>
        </div>
      ),
      tip:"Este es tu menú. En el celular está abajo; en el computador, a la izquierda.",
    },
    {
      icon:"🧠", eyebrow:"Tu perfil",
      title:"Tu personalidad, en 5 rasgos",
      text:"Con tus primeras respuestas armamos un perfil OCEAN. Para afinarlo, haz el test de 3 minutos en la pestaña Test.",
      visual:(
        <div>
          {[["O",72,"Apertura"],["C",48,"Responsab."],["E",35,"Extraversión"],["A",66,"Amabilidad"],["N",54,"Neuroticismo"]].map(([k,v,l]) => (
            <div key={k} className="tv-trait" title={l}>
              <strong>{k}</strong>
              <div className="tv-track"><div style={{width:`${v}%`}}/></div>
              <span>{v}</span>
            </div>
          ))}
        </div>
      ),
      tip:"No hay puntajes buenos ni malos: describen formas distintas de ser. Mientras más afinado tu perfil, mejores coincidencias.",
    },
    {
      icon:"✨", eyebrow:"Kindreds",
      title:"Personas afines cerca de ti",
      text:"Cada tarjeta es anónima: ves qué tan compatibles son, a qué distancia está y su edad. La foto y el nombre se revelan al conectar.",
      visual:(
        <>
          <div className="tv-card">
            <div className="tv-avatar">🌱</div>
            <div className="tv-row"><strong style={{color:"var(--soft)",fontWeight:400,fontStyle:"italic"}}>Alguien cerca de ti</strong></div>
            <div className="tv-row"><span>📍 2 km · 24 años</span><span className="tv-pin">1</span></div>
            <div className="tv-row" style={{marginBottom:4}}><span>Compatibilidad</span><span>87% <span className="tv-pin" style={{marginLeft:4}}>2</span></span></div>
            <div className="tv-track" style={{marginBottom:10}}><div style={{width:"87%"}}/></div>
            <div className="tv-row" style={{justifyContent:"center",fontSize:11,color:"var(--soft)"}}>🔒 Foto y nombre se revelan al conectar <span className="tv-pin" style={{marginLeft:4}}>3</span></div>
            <div className="tv-btn" style={{textAlign:"center"}}>Conectar →</div>
          </div>
        </>
      ),
      legend:["Distancia y edad de la persona","Qué tan compatibles son (según OCEAN y edad)","Tu privacidad: primero conversan, después se ven"],
    },
    {
      icon:"🎯", eyebrow:"Conectar",
      title:"Al conectar, avanzan juntos",
      text:"Antes de chatear te hacemos algunas preguntas cortas. Cada respuesta afina la afinidad entre ustedes.",
      visual:(
        <>
          <div className="tv-row"><span>Afinidad con alguien cerca de ti</span><strong>64%</strong></div>
          <div className="tv-bar-wrap">
            <div className="tv-track"><div style={{width:"64%"}}/></div>
            <div className="tv-mark" style={{left:"70%"}}><span>70% abre el chat</span></div>
          </div>
          <div className="tv-opt">🛋️ Serie y tranquilidad en casa</div>
          <div className="tv-opt sel">🍕 Una junta chica con amigos cercanos</div>
          <div className="tv-opt" style={{marginBottom:0}}>🎉 Salir donde haya mucha gente</div>
        </>
      ),
      tip:"Son mínimo 3 preguntas por persona. Tus respuestas quedan guardadas y mejoran tu perfil.",
    },
    {
      icon:"💬", eyebrow:"Conversaciones",
      title:"Conversa con temas, no con un “hola”",
      text:"En el chat puedes proponer un tema pensado para ustedes dos. La otra persona decide si lo acepta o lo pasa.",
      visual:(
        <>
          <div className="tv-bub recv">¡Hola! Qué bueno que conectamos 🌿</div>
          <div className="tv-bub sent">¡Hola! Igualmente, tenía ganas de conversar</div>
          <div className="tv-topic">
            <small>🎲 Esto o aquello</small>
            <p>¿Explorar un lugar nuevo — o dominar uno que ya conoces?</p>
            <div><span className="ok">Aceptar</span><span>Pasar</span></div>
          </div>
        </>
      ),
      tip:"Los temas se eligen según los rasgos donde más se diferencian, para que la conversación sea interesante.",
    },
    {
      icon:"🌙", eyebrow:"Comodidad",
      title:"Cuida tus ojos de noche",
      text:"Si usas Kindred con poca luz, activa el modo noche: fondo oscuro y letras claras. Pruébalo aquí mismo.",
      visual:(
        <div className="tv-switch-row">
          <div><strong>Modo noche</strong><small>{theme === "dark" ? "Activado" : "Desactivado"}</small></div>
          <button className="tv-switch" role="switch" aria-checked={theme === "dark"} aria-label="Modo noche" onClick={onToggleTheme}/>
        </div>
      ),
      tip:"También está en la barra de arriba (🌙) y se recuerda. Y el botón 💡 te devuelve a esta guía cuando quieras.",
    },
  ];

  const step = steps[i];
  const last = i === TOUR_LEN - 1;

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title">
        <div className="tour-top">
          <div className="tour-dots" role="tablist" aria-label="Pasos de la guía">
            {steps.map((_, n) => (
              <button key={n} role="tab" aria-selected={n === i} aria-label={`Paso ${n + 1} de ${TOUR_LEN}`}
                className={`tour-dot ${n === i ? "on" : n < i ? "done" : ""}`} onClick={() => setI(n)}/>
            ))}
          </div>
          {!last && <button className="tour-skip" onClick={onClose}>Saltar guía</button>}
        </div>

        <div className="tour-body" key={i}>
          <div className="tour-eyebrow"><span>{step.icon}</span>{step.eyebrow} · {i + 1} de {TOUR_LEN}</div>
          <h3 className="tour-title" id="tour-title">{step.title}</h3>
          <p className="tour-text">{step.text}</p>
          <div className="tour-visual">{step.visual}</div>
          {step.legend && (
            <div className="tour-legend">
              {step.legend.map((t, n) => <div key={n}><b>{n + 1}</b>{t}</div>)}
            </div>
          )}
          {step.tip && <p className="tour-tip">💡 {step.tip}</p>}
        </div>

        <div className="tour-foot">
          <button className="btn-back" onClick={() => setI(n => Math.max(n - 1, 0))} style={{visibility: i === 0 ? "hidden" : "visible"}}>← Atrás</button>
          <button className="btn-pill" autoFocus onClick={() => last ? onClose() : setI(n => n + 1)}>
            {last ? "¡Empezar! ✨" : "Siguiente →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Revelación: foto + ✕ / ✓ ────────────────────────────────────────────────
function RevealCard({ target, eyebrow, onYes, onNo }) {
  const who   = target.nickname || target.name || "Kindred";
  const first = who.split(" ")[0];
  return (
    <div className="tm-reveal">
      <div className="tm-reveal-eyebrow">{eyebrow}</div>
      <div className="tm-photo" style={{background: target.bg || "rgba(193,122,90,.14)"}}>
        {target.avatar_url
          ? <img src={target.avatar_url} alt={`Foto de ${who}`}/>
          : <span>{target.avatar || who[0]?.toUpperCase()}</span>}
      </div>
      <h3>{who}{target.age ? `, ${target.age}` : ""}</h3>
      <p>¿Quieres conversar con {first}?</p>
      <div className="tm-choice">
        <button className="tm-no"  onClick={onNo}  aria-label={`No, descartar a ${first}`} title="No, gracias">✕</button>
        <button className="tm-yes" onClick={onYes} aria-label={`Sí, conversar con ${first}`} title="¡Sí, conversemos!" autoFocus>✓</button>
      </div>
      <div className="tm-hint">✕ descartar · ✓ conversar</div>
    </div>
  );
}

// Alguien te aceptó: ves su foto y decides
function AcceptModal({ person, me, onAccept, onReject, onClose }) {
  const compat = compatOf(me, person);
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="tm-box">
        <RevealCard target={person} eyebrow={`Quiere conversar contigo 💌${compat != null ? ` · ${compat}%` : ""}`} onYes={onAccept} onNo={onReject}/>
        <div style={{textAlign:"center",marginTop:8}}>
          <button className="tour-skip" onClick={onClose}>Decidir después</button>
        </div>
      </div>
    </div>
  );
}

// ─── Test de afinidad (preguntas extra con alguien cercano) ──────────────────
function AffinityTestModal({ me, target, onSaveMe, onClose, onConnect, onReject }) {
  const [mine, setMine]   = useState(me);
  const [extra, setExtra] = useState(me.extra_answers || {});
  const [done, setDone]   = useState(0);
  const [asked, setAsked] = useState([]);   // preguntas ya hechas en ESTA sesión

  const compat     = compatOf(mine, target) ?? 0;
  const group      = getPairGroup(mine, target);
  // Primero preguntas que nunca respondiste; si ya respondiste todas, se repiten (sin repetir dentro de la misma sesión)
  const question   = nextExtraTest(group, Object.keys(extra), mine, target)
                  ?? nextExtraTest(group, asked, mine, target);
  const compatible = (done >= MIN_EXTRA_TESTS || !question) && compat >= COMPAT_THRESHOLD;
  const finished   = compatible || done >= MAX_EXTRA_TESTS || !question;

  const pick = (opt) => {
    const key = TRAIT_KEY[question.trait];
    const updated = { ...mine, [key]: refineTrait(mine[key], opt.score) };
    const nextExtra = { ...extra, [question.id]: opt.label };
    setMine(updated); setExtra(nextExtra); setDone(d => d + 1); setAsked(a => [...a, question.id]);
    onSaveMe(updated, nextExtra);
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && !(finished && compatible) && onClose()}>
      <div className="tm-box">
        {!(finished && compatible) && <button className="tm-close" onClick={onClose} aria-label="Cerrar">✕</button>}

        <div className="tm-compat">
          <div className="tm-compat-top"><span>Afinidad con alguien cerca de ti</span><span>{compat}%</span></div>
          <div className="tm-track"><div className={`tm-fill ${compat >= COMPAT_THRESHOLD ? "ok" : ""}`} style={{width:`${compat}%`}}/></div>
        </div>

        {!finished && (
          <>
            <div className="tm-label">Pregunta {done + 1} · avancemos en la compatibilidad</div>
            <h3 className="tm-q">{question.question}</h3>
            <div className="opts">
              {question.options.map(o => (
                <button key={o.label} className="opt" onClick={() => pick(o)}>{o.label}</button>
              ))}
            </div>
          </>
        )}

        {finished && compatible && (
          <RevealCard target={target} eyebrow={`¡Hay afinidad! 🌿 ${compat}%`} onYes={onConnect} onNo={onReject}/>
        )}

        {finished && !compatible && (
          <div className="tm-result">
            <h3>Todavía no vemos tanta afinidad</h3>
            <p>Después de {done} {done === 1 ? "pregunta" : "preguntas"} la compatibilidad es {compat}%. Tus respuestas quedaron guardadas y ayudan a encontrar mejores coincidencias.</p>
            <button className="btn-pill" onClick={onClose}>Entendido</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Test de personalidad OCEAN (Big Five) ───────────────────────────────────
const BIG5_TRAITS = [
  { key:"O", icon:"🌌", name:"Apertura a la experiencia",
    measures:"Qué tan curioso/a, creativo/a y abierto/a eres frente a ideas y experiencias nuevas.",
    example:"Probar cosas nuevas, imaginar posibilidades, cuestionar lo establecido.",
    low:"Prefieres lo conocido, lo práctico y lo que ya funciona.",
    mid:"Equilibras la novedad con la rutina según el momento.",
    high:"Eres curioso/a e imaginativo/a, y disfrutas explorar ideas y lugares nuevos." },
  { key:"C", icon:"🧭", name:"Responsabilidad",
    measures:"Cuánto orden, disciplina y constancia pones para cumplir lo que te propones.",
    example:"Planificar con anticipación, terminar lo que empiezas, cumplir plazos.",
    low:"Eres flexible y espontáneo/a; las rutinas rígidas te pesan.",
    mid:"Te organizas cuando hace falta y improvisas cuando conviene.",
    high:"Eres ordenado/a, constante y orientado/a a tus metas." },
  { key:"E", icon:"🎉", name:"Extraversión",
    measures:"Cuánta energía sacas de estar con otras personas y de estar en movimiento.",
    example:"Conversar con desconocidos, disfrutar los grupos grandes, tomar la iniciativa social.",
    low:"Recargas energía a solas o en grupos pequeños; tiendes a ser reservado/a.",
    mid:"Disfrutas tanto la compañía como tu tiempo a solas.",
    high:"La gente te da energía; eres sociable y expresivo/a." },
  { key:"A", icon:"🤝", name:"Amabilidad",
    measures:"Tu nivel de confianza, empatía y disposición a cooperar con los demás.",
    example:"Preocuparte por cómo se sienten otros, confiar, ceder para evitar conflictos.",
    low:"Eres directo/a y competitivo/a; defiendes tu criterio con firmeza.",
    mid:"Equilibras tus necesidades con las de los demás.",
    high:"Eres empático/a, confiado/a y colaborador/a." },
  { key:"N", icon:"🌊", name:"Neuroticismo",
    measures:"Qué tan intensamente sientes el estrés, la preocupación y los cambios de ánimo.",
    example:"Preocuparte con facilidad, sentir emociones intensas, recuperarte más lento de un mal momento. No es bueno ni malo: es una forma de sentir.",
    low:"Mantienes la calma con facilidad, incluso bajo presión.",
    mid:"Sientes el estrés a veces, pero lo sueles manejar bien.",
    high:"Sientes las emociones con intensidad y tiendes a preocuparte más; eso también te hace muy atento/a." },
];

// rev:true = afirmación inversa (se puntúa al revés)
const BIG5_ITEMS = {
  O: [
    { text:"Me atraen las ideas nuevas, aunque no tengan una utilidad inmediata.", rev:false },
    { text:"Disfruto probar actividades o lugares que nunca he conocido.", rev:false },
    { text:"Prefiero hacer las cosas siempre de la forma que ya conozco.", rev:true },
    { text:"Me cuesta interesarme por temas abstractos o artísticos.", rev:true },
  ],
  C: [
    { text:"Suelo planificar mis tareas antes de empezar.", rev:false },
    { text:"Cuando me propongo algo, lo termino aunque me aburra.", rev:false },
    { text:"Dejo las cosas para última hora con frecuencia.", rev:true },
    { text:"Se me olvidan compromisos o fechas con facilidad.", rev:true },
  ],
  E: [
    { text:"Me siento cómodo/a conversando con personas que recién conozco.", rev:false },
    { text:"Me energiza pasar tiempo en grupos grandes.", rev:false },
    { text:"Después de socializar mucho, necesito estar solo/a para recuperarme.", rev:true },
    { text:"Prefiero escuchar antes que ser quien lleva la conversación.", rev:true },
  ],
  A: [
    { text:"Me importa de verdad cómo se sienten las demás personas.", rev:false },
    { text:"Suelo confiar en las buenas intenciones de los demás.", rev:false },
    { text:"Antepongo mis intereses a los de otras personas.", rev:true },
    { text:"Me cuesta ceder en una discusión, aunque no sea tan importante.", rev:true },
  ],
  N: [
    { text:"Me preocupo con facilidad por cosas que podrían salir mal.", rev:false },
    { text:"Mi estado de ánimo cambia bastante de un día a otro.", rev:false },
    { text:"Aun en situaciones tensas, me mantengo tranquilo/a.", rev:true },
    { text:"Me recupero rápido de un mal momento.", rev:true },
  ],
};

const LIKERT = [
  { v:1, label:"Muy en desacuerdo" },
  { v:2, label:"En desacuerdo" },
  { v:3, label:"Neutral" },
  { v:4, label:"De acuerdo" },
  { v:5, label:"Muy de acuerdo" },
];

// Puntaje 0–100 por rasgo a partir de las respuestas 1–5
function scoreBig5(ans) {
  const out = {};
  BIG5_TRAITS.forEach(t => {
    const vals = BIG5_ITEMS[t.key].map((it, i) => {
      const v = ans[`${t.key}${i}`] ?? 3;
      return it.rev ? 6 - v : v;
    });
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    out[t.key] = Math.round(((avg - 1) / 4) * 100);
  });
  return out;
}
const bigLevel = (n) => n < 40 ? "Bajo" : n <= 60 ? "Medio" : "Alto";
const bigText  = (t, n) => n < 40 ? t.low : n <= 60 ? t.mid : t.high;

function PersonalityTest({ me, onSaveMe }) {
  const saved = me.extra_answers?.big5?.scores || null;
  const [phase, setPhase]     = useState(saved ? "result" : "start"); // start | intro | q | result
  const [ti, setTi]           = useState(0);
  const [qi, setQi]           = useState(0);
  const [answers, setAnswers] = useState({});
  const [scores, setScores]   = useState(saved);
  const lock = useRef(false);

  const trait = BIG5_TRAITS[ti];
  const items = BIG5_ITEMS[trait.key];
  const total = BIG5_TRAITS.length * 4;
  const answered = Object.keys(answers).length;

  const start = () => { setAnswers({}); setScores(null); setTi(0); setQi(0); setPhase("intro"); };

  const finish = (ans) => {
    const sc = scoreBig5(ans);
    setScores(sc);
    setPhase("result");
    const updated = { ...me, ocean_o:sc.O, ocean_c:sc.C, ocean_e:sc.E, ocean_a:sc.A, ocean_n:sc.N };
    onSaveMe(updated, { ...(me.extra_answers || {}), big5:{ at:new Date().toISOString(), scores:sc } });
  };

  const pick = (v) => {
    if (lock.current) return;
    lock.current = true;
    const next = { ...answers, [`${trait.key}${qi}`]: v };
    setAnswers(next);
    setTimeout(() => {
      if (qi < items.length - 1) setQi(qi + 1);
      else if (ti < BIG5_TRAITS.length - 1) { setTi(ti + 1); setQi(0); setPhase("intro"); }
      else finish(next);
      lock.current = false;
    }, 250);
  };

  const backFromQuestion = () => { if (qi > 0) setQi(qi - 1); else setPhase("intro"); };
  const backFromIntro = () => {
    if (ti > 0) { setTi(ti - 1); setQi(BIG5_ITEMS[BIG5_TRAITS[ti - 1].key].length - 1); setPhase("q"); }
    else setPhase("start");
  };

  const top = scores
    ? BIG5_TRAITS.reduce((best, t) => Math.abs(scores[t.key] - 50) > Math.abs(scores[best.key] - 50) ? t : best, BIG5_TRAITS[0])
    : null;

  return (
    <>
      <h2 className="panel-title">Tu test de <em>personalidad</em></h2>
      <p className="panel-sub">Descubre tu perfil OCEAN y mejora tus compatibilidades.</p>

      {phase === "start" && (
        <>
          <div className="tp-card" style={{marginBottom:24}}>
            <div className="tp-eyebrow">Modelo OCEAN · Big Five</div>
            <h3 className="tp-title">Cinco rasgos, un perfil tuyo</h3>
            <p className="tp-text">
              OCEAN no te encasilla en un “tipo” como otros tests. Te da un puntaje de 0 a 100 en cinco rasgos de la personalidad.
              Son 20 afirmaciones (4 por rasgo) y toma unos 3 minutos. No hay respuestas buenas ni malas.
            </p>
            <button className="btn-pill" onClick={start}>Empezar el test →</button>
          </div>
          <div className="tp-eyebrow">Lo que vamos a medir</div>
          <div className="tp-grid">
            {BIG5_TRAITS.map(t => (
              <div key={t.key} className="tp-mini">
                <div className="tp-mini-icon">{t.icon}</div>
                <h4>{t.name}</h4>
                <p>{t.measures}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {phase === "intro" && (
        <div className="tp-card">
          <div className="prog-bar" style={{marginBottom:28}}><div className="prog-fill" style={{width:`${(answered / total) * 100}%`}}/></div>
          <div className="tp-eyebrow">Parte {ti + 1} de {BIG5_TRAITS.length}</div>
          <div className="tp-big-icon">{trait.icon}</div>
          <h3 className="tp-title">{trait.name}</h3>
          <div className="tp-box"><strong>Qué mide</strong><p>{trait.measures}</p></div>
          <div className="tp-box"><strong>Por ejemplo</strong><p>{trait.example}</p></div>
          <p className="tp-text" style={{marginTop:18}}>Verás {items.length} afirmaciones. Elige qué tan de acuerdo estás con cada una.</p>
          <div className="tp-foot">
            <button className="btn-back" onClick={backFromIntro}>← Atrás</button>
            <button className="btn-pill" onClick={() => setPhase("q")}>Comenzar →</button>
          </div>
        </div>
      )}

      {phase === "q" && (
        <div className="tp-card">
          <div className="prog-bar" style={{marginBottom:28}}><div className="prog-fill" style={{width:`${(answered / total) * 100}%`}}/></div>
          <div className="tp-eyebrow">{trait.icon} {trait.name} · {qi + 1} de {items.length}</div>
          <h3 className="tp-title">{items[qi].text}</h3>
          <div className="tp-opts">
            {LIKERT.map(o => (
              <button key={o.v} className={`opt ${answers[`${trait.key}${qi}`] === o.v ? "sel" : ""}`} onClick={() => pick(o.v)}>{o.label}</button>
            ))}
          </div>
          <div className="tp-foot">
            <button className="btn-back" onClick={backFromQuestion}>← Atrás</button>
          </div>
        </div>
      )}

      {phase === "result" && scores && (
        <>
          <div className="tp-card">
            <div className="tp-eyebrow">Tu resultado</div>
            <h3 className="tp-title">Tu rasgo más marcado es {top.name.toLowerCase()} {top.icon}</h3>
            <p className="tp-text">
              {bigText(top, scores[top.key])} Estos puntajes ya se guardaron en tu perfil y se usan para calcular tu compatibilidad con otras personas.
            </p>
            <button className="btn-pill" onClick={start}>Repetir el test</button>
          </div>

          <div className="tp-res-grid">
            {BIG5_TRAITS.map(t => (
              <div key={t.key} className="tp-res">
                <div className="tp-res-head">
                  <div className="tp-res-icon">{t.icon}</div>
                  <div>
                    <div className="tp-res-name">{t.name}</div>
                    <div className="tp-res-level">Nivel {bigLevel(scores[t.key]).toLowerCase()}</div>
                  </div>
                  <div className="tp-res-score">{scores[t.key]}</div>
                </div>
                <div className="tp-bar"><div style={{width:`${scores[t.key]}%`}}/></div>
                <p>{bigText(t, scores[t.key])}</p>
              </div>
            ))}
          </div>

          <p className="tp-note">
            Este test es una guía para conocerte mejor y encontrar mejores coincidencias, no un diagnóstico psicológico. Ningún puntaje es “mejor” que otro: solo describen formas distintas de ser.
          </p>
        </>
      )}
    </>
  );
}

// ─── Demo Modal ───────────────────────────────────────────────────────────────
function DemoModal({ onClose }) {
  const [messages, setMessages] = useState([]);
  const [typing, setTyping]     = useState(false);
  const [idx, setIdx]           = useState(0);
  const [input, setInput]       = useState("");
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, typing]);

  useEffect(() => {
    if (idx >= DEMO_SCRIPT.length) return;
    const item = DEMO_SCRIPT[idx];
    const t = setTimeout(() => {
      if (item.type === "recv") {
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          setMessages(p => [...p, { ...item, id:Date.now() }]);
          setIdx(i => i + 1);
        }, 1100);
      } else {
        setMessages(p => [...p, { ...item, id:Date.now() }]);
        setIdx(i => i + 1);
      }
    }, item.delay);
    return () => clearTimeout(t);
  }, [idx]);

  const send = () => {
    if (!input.trim()) return;
    const now = new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
    setMessages(p => [...p, { id:Date.now(), type:"sent", text:input.trim(), time:now }]);
    setInput("");
    setTimeout(() => {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        const r = ["Eso es justo lo que yo siento.","¿En serio? Cuéntame más.","Nunca lo había pensado así.","Me alegra que lo digas."];
        setMessages(p => [...p, { id:Date.now()+1, type:"recv", text:r[Math.floor(Math.random()*r.length)], time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) }]);
      }, 1100);
    }, 400);
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="demo-modal">
        <div className="demo-left">
          <button className="demo-close" onClick={onClose}>✕</button>
          <div className="demo-avatar" style={{background:"#E8F4E8"}}>🌿</div>
          <div className="demo-name">Valentina</div>
          <div className="demo-age">24 años · Santiago</div>
          <div className="demo-reason">
            <strong>Por qué conectan</strong>
            <p>Los dos son noctámbulos curiosos que hablan solos cuando piensan — y valoran las conversaciones reales.</p>
          </div>
          <div className="demo-compat-label"><span>Afinidad</span><span>87%</span></div>
          <div className="demo-track"><div className="demo-fill" style={{width:"87%"}}/></div>
          <div className="how-steps">
            {[["Respondes preguntas reales","No armas un perfil. Respondés cosas que revelan quién sos de verdad."],
              ["Kindred encuentra afinidad","El algoritmo busca compatibilidad de fondo, no solo gustos en común."],
              ["Primero la conversación","Conocés a la persona antes de ver su foto. La foto viene cuando ya hay algo."]
            ].map(([t,s],i) => (
              <div className="how-step" key={i}>
                <div className="how-num">{i+1}</div>
                <div className="how-text"><strong>{t}</strong><span>{s}</span></div>
              </div>
            ))}
          </div>
        </div>
        <div className="demo-right">
          <div className="demo-chat-hdr">
            <h3>Así empieza una conversación en Kindred</h3>
            <p>El tema lo propone Kindred. Tú decides cómo responder.</p>
          </div>
          <div className="demo-prompt">
            <p>"¿Qué harías si tuvieras un día completamente libre?"</p>
            <small>Kindred sugiere el primer tema para romper el hielo</small>
          </div>
          <div className="demo-msgs">
            {messages.map(m => (
              <div key={m.id} className={`d-msg ${m.type}`}>
                <div className="d-bub">{m.text}</div>
                {m.time && <span className="d-time">{m.time}</span>}
              </div>
            ))}
            {typing && <div className="d-msg recv"><div className="typing"><span/><span/><span/></div></div>}
            <div ref={endRef}/>
          </div>
          <div className="demo-input-row">
            <textarea className="d-inp" placeholder="Escribe algo real..." value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();} }} rows={1}/>
            <button className="d-send" onClick={send}>→</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]       = useState("loading");
  const [showDemo, setShowDemo]   = useState(false);
  const [step, setStep]           = useState(0);
  const [answers, setAnswers]     = useState({});
  const [selOpt, setSelOpt]       = useState(null);
  const [panel, setPanel]         = useState("kindreds");
  const [showCards, setShowCards] = useState(false);
  const [activeConvo, setActiveConvo] = useState(null);
  const [chatMsgs, setChatMsgs]   = useState({});
  const [msgInput, setMsgInput]   = useState("");
  const [authUser, setAuthUser]   = useState(null);
  const [userForm, setUserForm]   = useState({ name:"", email:"", password:"", age:"" });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [profile, setProfile]     = useState({ nickname:"", bio:"", interests:[], photo:null, relationshipStatus:"", interestedIn:[] });
  const [interestInput, setInterestInput] = useState("");
  const [nearbyProfiles, setNearbyProfiles] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [realMatches, setRealMatches] = useState([]);
  const [pendingProposal, setPendingProposal] = useState(null);
  // Mis datos para compatibilidad: edad + scores OCEAN + tests extra respondidos
  const [me, setMe] = useState({ age:null, ocean_o:50, ocean_c:50, ocean_e:50, ocean_a:50, ocean_n:50, extra_answers:{} });
  const [testTarget, setTestTarget] = useState(null);
  const [testSource, setTestSource] = useState("card");        // de dónde vino: "card" | "roulette"
  const [rouletteKey, setRouletteKey] = useState(0);            // al descartar, la ruleta se reinicia
  const [skippedIds, setSkippedIds] = useState([]);
  const [rouletteNotice, setRouletteNotice] = useState("");
  // Match mutuo: quién te aceptó, a quién esperas y a quién ocultar
  const [social, setSocial] = useState({ incoming:[], waiting:[], hiddenIds:[] });
  const [acceptTarget, setAcceptTarget] = useState(null);
  const [testPending, setTestPending] = useState(null);   // persona de ejemplo que "está por aceptar"
  const [toast, setToast] = useState("");
  const testTimer = useRef(null);
  const [showTour, setShowTour] = useState(false);
  // Tema: lo guardado por la persona o, si no hay, el del sistema
  const [theme, setTheme] = useState(() => {
    try { const t = localStorage.getItem("kindred-theme"); if (t === "dark" || t === "light") return t; } catch { /* sin storage */ }
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const toggleTheme = () => setTheme(t => {
    const next = t === "dark" ? "light" : "dark";
    try { localStorage.setItem("kindred-theme", next); } catch { /* sin storage */ }
    return next;
  });
  const [topicOptions, setTopicOptions]       = useState(null);
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const subRef     = useRef(null);
  const subTopicRef = useRef(null);
  const photoRef = useRef(null);
  const endRef   = useRef(null);

  // Sesión inicial
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) { console.error("Supabase getSession error:", error); setScreen("landing"); return; }
      if (session?.user) {
        setAuthUser(session.user);
        setUserForm(f => ({ ...f, name: session.user.user_metadata?.name || "", email: session.user.email }));
        loadProfile(session.user.id).then(() => { setScreen("dashboard"); loadMatches(session.user.id); }).catch(() => setScreen("dashboard"));
      } else {
        setScreen("landing");
      }
    }).catch((e) => { console.error("Supabase error:", e); setScreen("landing"); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) setAuthUser(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (screen === "dashboard") setTimeout(() => setShowCards(true), 200); }, [screen]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [chatMsgs, activeConvo]);

  const loadProfile = async (uid) => {
    try {
      const data = await getProfile(uid);
      if (data) {
        setProfile({ nickname: data.nickname||"", bio: data.bio||"", interests: data.interests||[], photo: data.avatar_url||null, relationshipStatus: data.relationship_status||"", interestedIn: data.interested_in||[] });
        setMe({ age: data.age ?? null, ocean_o: data.ocean_o ?? 50, ocean_c: data.ocean_c ?? 50, ocean_e: data.ocean_e ?? 50, ocean_a: data.ocean_a ?? 50, ocean_n: data.ocean_n ?? 50, extra_answers: data.extra_answers || {} });
      }
    } catch(e) { console.error(e); }
  };

  // Auto-guardar perfil
  useEffect(() => {
    if (!authUser) return;
    const t = setTimeout(async () => {
      try {
        await upsertProfile(authUser.id, {
          nickname:            profile.nickname,
          bio:                 profile.bio,
          interests:           profile.interests,
          relationship_status: profile.relationshipStatus,
          interested_in:       profile.interestedIn,
          ...(profile.photo?.startsWith("http") && { avatar_url: profile.photo }),
        });
      } catch(e) { console.error(e); }
    }, 900);
    return () => clearTimeout(t);
  }, [profile.nickname, profile.bio, profile.interests, profile.relationshipStatus, profile.interestedIn]);

  // Geolocalización
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const { latitude: lat, longitude: lng } = coords;
      setUserLocation({ lat, lng });
      if (authUser) {
        try {
          await upsertProfile(authUser.id, { lat, lng });
          const nearby = await getNearbyProfiles(authUser.id, lat, lng);
          setNearbyProfiles(nearby || []);
        } catch(e) { console.error(e); }
      }
    }, () => {});
  }, [authUser]);

  useEffect(() => { if (screen === "dashboard" && authUser) requestLocation(); }, [screen, authUser]);

  // Deriva scores OCEAN aproximados de las respuestas del onboarding (5 preguntas de opción múltiple)
  const deriveOceanFromAnswers = (ans) => {
    // Pregunta 1: qué haces si no puedes dormir → Neuroticismo
    const q1 = ans[1] || "";
    const n = q1.includes("vueltas") ? 70 : q1.includes("teléfono") ? 55 : q1.includes("caminar") ? 40 : 45;
    // Pregunta 2: cómo te sientes en reuniones → Extraversión
    const q2 = ans[2] || "";
    const e = q2.includes("presento") ? 75 : q2.includes("Observo") ? 45 : q2.includes("Espero") ? 35 : 50;
    // Pregunta 3: de qué hablarías horas → Apertura
    const q3 = ans[3] || "";
    const o1 = q3.includes("Ideas") ? 85 : q3.includes("Historias") ? 65 : q3.includes("Proyectos") ? 60 : 50;
    // Pregunta 4: qué valoras en una relación → Apertura + Amabilidad
    const q4 = ans[4] || "";
    const o2 = q4.includes("profundas") ? 80 : q4.includes("crecer") ? 70 : 55;
    const a1 = q4.includes("profundas") ? 70 : q4.includes("Reírnos") ? 75 : q4.includes("ser yo") ? 60 : 65;
    // Pregunta 5: qué hace que alguien te caiga bien → Amabilidad + Responsabilidad
    const q5 = ans[5] || "";
    const a2 = q5.includes("escuche") ? 80 : q5.includes("honesto") ? 65 : q5.includes("curiosidad") ? 60 : 70;
    const c = q5.includes("honesto") ? 70 : q5.includes("curiosidad") ? 60 : 55;

    const o = Math.round((o1 + o2) / 2);
    const a = Math.round((a1 + a2) / 2);
    return { ocean_o: o, ocean_c: c, ocean_e: e, ocean_a: a, ocean_n: n };
  };

  // Auth
  const handleRegister = async () => {
    setAuthLoading(true); setAuthError("");
    try {
      const ageNum = Number(userForm.age);
      const data = await signUp(userForm.email, userForm.password, userForm.name, ageNum);
      setAuthUser(data.user);
      if (data.user) {
        // Edad + (si respondió el onboarding) scores OCEAN derivados
        let fields = { age: ageNum };
        if (Object.keys(answers).length > 0) {
          await saveAnswers(data.user.id, answers);
          fields = { ...fields, ...deriveOceanFromAnswers(answers) };
        }
        await upsertProfile(data.user.id, fields);
        setMe(m => ({ ...m, ...fields }));
      }
      setScreen("dashboard");
      setShowTour(true);
      loadMatches(data.user.id);
    } catch(e) { setAuthError(e.message || "Error al registrarse"); }
    finally { setAuthLoading(false); }
  };

  const handleLogin = async () => {
    setAuthLoading(true); setAuthError("");
    try {
      const data = await signIn(userForm.email, userForm.password);
      setAuthUser(data.user);
      setUserForm(f => ({ ...f, name: data.user.user_metadata?.name || f.name }));
      await loadProfile(data.user.id);
      setScreen("dashboard");
      loadMatches(data.user.id);
    } catch(e) { setAuthError(e.message || "Email o contraseña incorrectos"); }
    finally { setAuthLoading(false); }
  };

  const handleLogout = async () => {
    await signOut();
    setAuthUser(null);
    setUserForm({ name:"", email:"", password:"", age:"" });
    setProfile({ nickname:"", bio:"", interests:[], photo:null });
    setMe({ age:null, ocean_o:50, ocean_c:50, ocean_e:50, ocean_a:50, ocean_n:50, extra_answers:{} });
    setTestTarget(null);
    setAcceptTarget(null);
    setTestPending(null);
    setToast("");
    clearTimeout(testTimer.current);
    setNearbyProfiles([]);
    setScreen("landing");
  };

  // Foto
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setProfile(p => ({ ...p, photo: ev.target.result }));
    reader.readAsDataURL(file);
    if (authUser) {
      try {
        const url = await uploadPhoto(authUser.id, file);
        setProfile(p => ({ ...p, photo: url }));
        await upsertProfile(authUser.id, { avatar_url: url });
      } catch(e) { console.error(e); }
    }
  };

  // Conversaciones
  const openConvo = async (m) => {
    setActiveConvo(m);
    setShowTopicPicker(false);
    setTopicOptions(null);
    setPendingProposal(null);
    if (subRef.current) { supabase.removeChannel(subRef.current); subRef.current = null; }
    if (subTopicRef.current) { supabase.removeChannel(subTopicRef.current); subTopicRef.current = null; }
    const convoKey = m.matchId || m.id;
    if (m.matchId) {
      // Cargar propuesta pendiente si existe
      getPendingProposal(m.matchId).then(p => setPendingProposal(p)).catch(() => {});
      // Suscribir a cambios de propuestas en tiempo real
      subTopicRef.current = subscribeToProposals(m.matchId, (proposal) => {
        if (proposal.status === 'pending') setPendingProposal(proposal);
        if (proposal.status === 'rejected') setPendingProposal(null);
        if (proposal.status === 'accepted') setPendingProposal(null);
      });
      const msgs = await getMessages(m.matchId);
      setChatMsgs(p => ({ ...p, [convoKey]: msgs.map(msg => ({
        id: msg.id, type: msg.sender_id === authUser?.id ? "sent" : "recv",
        text: msg.text, time: new Date(msg.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})
      })) }));
      subRef.current = subscribeToMessages(m.matchId, (msg) => {
        setChatMsgs(p => ({ ...p, [convoKey]: [...(p[convoKey]||[]), {
          id: msg.id, type: msg.sender_id === authUser?.id ? "sent" : "recv",
          text: msg.text, time: new Date(msg.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})
        }] }));
        setTimeout(() => endRef.current?.scrollIntoView({behavior:"smooth"}), 50);
      });
    } else {
      if (!chatMsgs[convoKey]) setChatMsgs(p => ({ ...p, [convoKey]: m.msgs || [] }));
    }
  };

  const sendMsg = async () => {
    if (!msgInput.trim() || !activeConvo) return;
    const text = msgInput.trim();
    setMsgInput("");
    const convoKey = activeConvo.matchId || activeConvo.id;
    if (activeConvo.matchId && authUser) {
      await sendMessage(activeConvo.matchId, authUser.id, text);
    } else {
      const now = new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
      setChatMsgs(p => ({ ...p, [convoKey]: [...(p[convoKey]||[]), { id:Date.now(), type:"sent", text, time:now }] }));
      if (activeConvo.id === TEST_MATCH.id) {
        setTimeout(() => {
          const reply = TEST_REPLIES[Math.floor(Math.random()*TEST_REPLIES.length)];
          const t = new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
          setChatMsgs(p => ({ ...p, [convoKey]: [...(p[convoKey]||[]), { id:Date.now()+1, type:"recv", text:reply, time:t }] }));
        }, 1200);
      }
    }
    setTimeout(() => endRef.current?.scrollIntoView({behavior:"smooth"}), 50);
  };

  const loadMatches = async (userId) => {
    try {
      const matches = await getMatches(userId);
      const mapped = matches.map(m => ({
        id: m.matchId, matchId: m.matchId,
        name: m.profile.nickname || m.profile.name || "Kindred",
        avatar: (m.profile.nickname || m.profile.name || "K")[0].toUpperCase(),
        bg: "#EEEDFE", depth: "Nueva conexión", avatar_url: m.profile.avatar_url,
        profile: m.profile,
      }));
      setRealMatches(mapped);
      return mapped;
    } catch(e) { console.error("loadMatches:", e); return []; }
  };

  // Carga opciones de tema según OCEAN de ambos perfiles
  const loadTopicOptions = async () => {
    if (!activeConvo?.matchId || !authUser) return;
    try {
      const myProfile = me;
      const theirProfileData = realMatches.find(m => m.matchId === activeConvo.matchId);
      const opts = selectTopics(myProfile, theirProfileData?.profile || {});
      setTopicOptions(opts);
    } catch(e) { console.error("loadTopicOptions:", e); }
  };

  // Guarda mis scores afinados + respuestas de tests extra
  const handleSaveMe = async (updated, extraAnswers) => {
    setMe({ ...updated, extra_answers: extraAnswers });
    if (!authUser) return;
    try {
      await upsertProfile(authUser.id, {
        ocean_o: updated.ocean_o, ocean_c: updated.ocean_c, ocean_e: updated.ocean_e,
        ocean_a: updated.ocean_a, ocean_n: updated.ocean_n,
        extra_answers: extraAnswers,
      });
    } catch(e) { console.error("handleSaveMe:", e); }
  };

  // Proponer un tema
  const handleProposeTopic = async (topic) => {
    if (!activeConvo?.matchId || !authUser || !topicOptions) return;
    setShowTopicPicker(false);
    try {
      const proposal = await proposeTopic(activeConvo.matchId, authUser.id, topic, topicOptions.trait);
      setPendingProposal(proposal);
    } catch(e) { console.error("handleProposeTopic:", e); }
  };

  // Responder a propuesta (aceptar / rechazar)
  const handleRespondProposal = async (proposalId, accept) => {
    try {
      await respondToProposal(proposalId, accept);
      if (accept) {
        // Enviar el tema como mensaje especial al chat
        const topic = pendingProposal;
        await sendMessage(activeConvo.matchId, authUser.id, topic.topic_text);
        setPendingProposal(null);
      } else {
        setPendingProposal(null);
      }
    } catch(e) { console.error("handleRespondProposal:", e); }
  };

  const refreshSocial = async () => {
    if (!authUser) return;
    try { setSocial(await getSocialState(authUser.id)); } catch (e) { console.error("refreshSocial:", e); }
  };

  // Carga el estado social y escucha en tiempo real matches nuevos y personas que te aceptan
  useEffect(() => {
    if (!authUser?.id) { setSocial({ incoming:[], waiting:[], hiddenIds:[] }); return; }
    const uid = authUser.id;
    const reload = () => getSocialState(uid).then(setSocial).catch(e => console.error("social:", e));
    reload();
    const ch = subscribeToSocial(uid, {
      onMatch: () => { loadMatches(uid); reload(); setToast("¡Hay match! 🌿 Ya pueden conversar"); },
      onIncomingLike: () => { reload(); setToast("Alguien quiere conversar contigo 💌"); },
    });
    return () => { if (ch) supabase.removeChannel(ch); };
  }, [authUser?.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => () => clearTimeout(testTimer.current), []);

  // ✕ : descartar (se guarda para no volver a mostrarla)
  const rejectPerson = async (person) => {
    if (!authUser || typeof person.id === "number") return;
    try { await sendPass(authUser.id, person.id); } catch (e) { console.error("sendPass:", e); }
    refreshSocial();
  };

  const startConvo = async (otherProfile) => {
    setPanel("conversations");
    const nm = otherProfile.nickname || otherProfile.name || "esa persona";

    // Persona de ejemplo / prueba: se simula que también te acepta a los pocos segundos
    if (!authUser || typeof otherProfile.id === "number") {
      setActiveConvo(null);
      setTestPending(otherProfile);
      setToast(`Esperando a que ${nm} también acepte…`);
      clearTimeout(testTimer.current);
      testTimer.current = setTimeout(() => {
        setTestPending(null);
        setToast(`¡Match con ${nm}! ${otherProfile.avatar || "🌿"} Ya pueden conversar`);
        setPanel("conversations");
        openConvo(otherProfile);
      }, TEST_AUTO_ACCEPT_MS);
      return;
    }

    try {
      const { matched } = await sendLike(authUser.id, otherProfile.id);
      if (matched) {
        // Las dos personas aceptaron: se abre el chat directamente
        const list = await loadMatches(authUser.id);
        const created = list.find(x => x.profile?.id === otherProfile.id);
        if (created) await openConvo(created);
      } else {
        // Solo aceptaste tú: no hay chat hasta que la otra persona también acepte
        setActiveConvo(null);
        setToast(`Listo ✓ Cuando ${nm} también acepte, se abre el chat`);
      }
      refreshSocial();
    } catch(e) { console.error("startConvo:", e); setToast("No pudimos enviar tu ✓. Intenta de nuevo."); }
  };

  // Onboarding
  const q    = QUESTIONS[step] || QUESTIONS[0];
  const prog = (step / QUESTIONS.length) * 100;
  const answer = v => { setAnswers(a => ({ ...a, [q.id]: v })); setSelOpt(v); };
  const nextQ  = () => { if (step < QUESTIONS.length-1) { setStep(s=>s+1); setSelOpt(answers[QUESTIONS[step+1]?.id]||null); } else setScreen("register"); };
  const answerAndAdvance = v => { answer(v); setTimeout(nextQ, 300); };
  const backQ  = () => { if (step > 0) { setStep(s=>s-1); setSelOpt(answers[QUESTIONS[step-1]?.id]||null); } else setScreen("landing"); };

  const convoList   = SHOW_TEST_MATCH ? [TEST_MATCH, ...realMatches] : realMatches;
  const displayName = profile.nickname || userForm.name || "Tú";
  const fran        = SHOW_FRAN ? makeFran(me) : null;
  const hiddenSet   = new Set(social.hiddenIds);
  const visibleNearby = nearbyProfiles.filter(p => !hiddenSet.has(p.id));
  const showList    = [...(fran ? [fran] : []), ...(nearbyProfiles.length > 0 ? visibleNearby : DEMO_MATCHES)];
  const pendingList = [...social.waiting, ...(testPending ? [testPending] : [])];
  const isRealData  = nearbyProfiles.length > 0;
  const ageNum      = Number(userForm.age);
  const ageValid    = Number.isInteger(ageNum) && ageNum >= 18 && ageNum <= 99;

  // Al dar "Conectar" siempre salen tests para avanzar en la compatibilidad.
  // Solo se conecta directo si no hay datos de personalidad de la otra persona.
  const handleConnect = (m, source = "card") => {
    if (compatOf(me, m) === null) { startConvo(m); return; }
    setTestSource(source);
    setTestTarget(m);
  };

  return (
    <div>
      <style>{css}</style>
      <div className="blob blob-a"/>
      <div className="blob blob-b"/>
      <div className="blob blob-c"/>
      {showDemo && <DemoModal onClose={() => setShowDemo(false)}/>}
      {showTour && screen === "dashboard" && (
        <WelcomeTour name={userForm.name} theme={theme} onToggleTheme={toggleTheme} onClose={() => setShowTour(false)} />
      )}
      {acceptTarget && (
        <AcceptModal
          person={acceptTarget}
          me={me}
          onClose={() => setAcceptTarget(null)}
          onAccept={() => { const p = acceptTarget; setAcceptTarget(null); startConvo(p); }}
          onReject={() => { const p = acceptTarget; setAcceptTarget(null); rejectPerson(p); }}
        />
      )}
      {toast && <div className="toast-wrap"><div className="toast" role="status">{toast}</div></div>}
      {testTarget && (
        <AffinityTestModal
          me={me}
          target={testTarget}
          onSaveMe={handleSaveMe}
          onClose={() => setTestTarget(null)}
          onConnect={() => { const t = testTarget; setTestTarget(null); startConvo(t); }}
          onReject={() => {
            const t = testTarget;
            setTestTarget(null);
            rejectPerson(t);
            // Si venía de la ruleta: se descarta a esa persona y se vuelve a tirar la ruleta
            if (testSource === "roulette") {
              setSkippedIds(ids => [...ids, t.id]);
              setRouletteNotice("Sin problema 🌿 Gira otra vez para conocer a alguien más.");
              setRouletteKey(k => k + 1);
              setPanel("conversations");
              setActiveConvo(null);
            }
          }}
        />
      )}

      {/* LOADING */}
      {screen === "loading" && (
        <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{fontFamily:"'Lora',serif",fontSize:26,color:"var(--terra)",opacity:.8}}>kind<em>red</em></div>
        </div>
      )}

      {/* NAV */}
      {screen !== "loading" && (
        <nav className="nav">
          <div className="nav-inner">
            <div className="logo" onClick={() => setScreen(authUser ? "dashboard" : "landing")}>kind<em>red</em></div>
            <div className="nav-r">
              {screen !== "landing" && screen !== "dashboard" && (
                <button className="btn-ghost" onClick={() => setScreen("landing")}>← Inicio</button>
              )}
              {!authUser && (
                <>
                  <button className="btn-ghost" onClick={() => { setAuthError(""); setScreen("login"); }}>Iniciar sesión</button>
                  <button className="btn-pill"  onClick={() => setScreen("onboarding")}>Unirse</button>
                </>
              )}
              {screen === "dashboard" && authUser && (
                <div className="nav-hello" style={{fontSize:14,color:"var(--mid)"}}>Hola, <strong style={{color:"var(--dark)"}}>{userForm.name||"tú"}</strong> 👋</div>
              )}
              {screen === "dashboard" && authUser && (
                <button className="icon-btn" onClick={() => setShowTour(true)} aria-label="Ver guía: cómo funciona Kindred" title="Cómo funciona">💡</button>
              )}
              <button className="icon-btn" onClick={toggleTheme}
                aria-label={theme === "dark" ? "Activar modo día" : "Activar modo noche"}
                title={theme === "dark" ? "Modo día" : "Modo noche"}>
                {theme === "dark" ? "☀️" : "🌙"}
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* LANDING */}
      {screen === "landing" && (
        <>
          <div className="landing-wrap">
            <div className="hero-content">
              <div className="callout">
                <span className="strike">Swipe. Match. Nada.</span>
                <span className="arr">→</span>
                <span>Conexiones que importan</span>
              </div>
              <h1 className="h1">Encuentra a alguien<br/>que te <em>entienda</em></h1>
              <p className="hero-p">Kindred no te muestra caras al azar. Te conecta con personas con quienes podrías tener una conversación real — sin filtros, sin performance.</p>
              <div className="cta-row">
                <button className="btn-pill btn-big" onClick={() => setScreen("onboarding")}>Empezar →</button>
                <button className="btn-outline" onClick={() => setShowDemo(true)}>Conocer más</button>
              </div>
            </div>
          </div>
          <div className="feats">
            {[["💬","Conversaciones antes que fotos"],["🧩","Match por compatibilidad real"],["🔒","Sin métricas de popularidad"],["🌱","Revelación progresiva"]].map(([icon,txt]) => (
              <div className="feat" key={txt}><div className="feat-icon">{icon}</div>{txt}</div>
            ))}
          </div>
        </>
      )}

      {/* ONBOARDING */}
      {screen === "onboarding" && (
        <div className="screen-center">
          <div className="card">
            <div className="prog-bar"><div className="prog-fill" style={{width:`${prog}%`}}/></div>
            <div className="q-label">{q.label} · {step+1} de {QUESTIONS.length}</div>
            <h2 className="q-text">{q.question}</h2>
            {q.hint && <p className="q-hint">{q.hint}</p>}
            {q.type === "text" && (
              <textarea className="textarea" placeholder={q.placeholder}
                value={answers[q.id]||""} onChange={e => answer(e.target.value)} rows={4}/>
            )}
            {q.type === "options" && (
              <div className="opts">
                {q.options.map(o => (
                  <button key={o} className={`opt ${selOpt===o?"sel":""}`} onClick={() => answerAndAdvance(o)}>{o}</button>
                ))}
              </div>
            )}
            <div className="card-foot">
              <button className="btn-back" onClick={backQ}>← Atrás</button>
              {q.type === "text" && (
                <button className="btn-pill" onClick={nextQ} disabled={!answers[q.id]}>
                  {step === QUESTIONS.length-1 ? "Crear mi cuenta →" : "Siguiente →"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REGISTRO */}
      {screen === "register" && (
        <div className="screen-center">
          <div className="auth-card">
            <div className="welcome-box">
              <p>✨ Ya respondiste las preguntas. Ahora crea tu cuenta para ver tus <strong>kindreds</strong>.</p>
            </div>
            <h2 className="auth-title">Casi listo,<br/><em>bienvenido/a</em></h2>
            <p className="auth-sub">Crea tu cuenta para guardar tu perfil y conocer a tus coincidencias.</p>
            <div className="field">
              <label>Tu nombre</label>
              <input type="text" placeholder="¿Cómo te llamas?" value={userForm.name} onChange={e => setUserForm(f=>({...f,name:e.target.value}))}/>
            </div>
            <div className="field">
              <label>Tu edad</label>
              <input type="number" inputMode="numeric" min="18" max="99" placeholder="Ej: 24" value={userForm.age} onChange={e => setUserForm(f=>({...f,age:e.target.value}))}/>
              {userForm.age !== "" && !ageValid && (
                <span style={{fontSize:12,color:"var(--terra)"}}>Kindred es para personas de 18 años o más.</span>
              )}
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" placeholder="tu@email.com" value={userForm.email} onChange={e => setUserForm(f=>({...f,email:e.target.value}))}/>
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input type="password" placeholder="Mínimo 8 caracteres" value={userForm.password} onChange={e => setUserForm(f=>({...f,password:e.target.value}))}/>
            </div>
            {authError && <div className="auth-error">{authError}</div>}
            <button className="btn-pill auth-btn"
              disabled={authLoading||!userForm.name||!ageValid||!userForm.email||!userForm.password}
              onClick={handleRegister}>
              {authLoading ? "Creando cuenta..." : "Ver mis kindreds ✨"}
            </button>
            <div className="auth-toggle">
              ¿Ya tienes cuenta? <button onClick={() => { setAuthError(""); setScreen("login"); }}>Iniciar sesión</button>
            </div>
          </div>
        </div>
      )}

      {/* LOGIN */}
      {screen === "login" && (
        <div className="screen-center">
          <div className="auth-card">
            <h2 className="auth-title">Hola de nuevo,<br/><em>bienvenido/a</em></h2>
            <p className="auth-sub">Ingresa con tu cuenta para ver tus conversaciones y kindreds.</p>
            <div className="field">
              <label>Email</label>
              <input type="email" placeholder="tu@email.com" value={userForm.email} onChange={e => setUserForm(f=>({...f,email:e.target.value}))}/>
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input type="password" placeholder="Tu contraseña" value={userForm.password} onChange={e => setUserForm(f=>({...f,password:e.target.value}))}/>
            </div>
            {authError && <div className="auth-error">{authError}</div>}
            <button className="btn-pill auth-btn"
              disabled={authLoading||!userForm.email||!userForm.password}
              onClick={handleLogin}>
              {authLoading ? "Entrando..." : "Entrar →"}
            </button>
            <div className="auth-divider"><div/><span>o</span><div/></div>
            <div className="auth-toggle">
              ¿No tienes cuenta? <button onClick={() => { setAuthError(""); setScreen("onboarding"); }}>Crear una</button>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD */}
      {screen === "dashboard" && (
        <div className="dashboard">

          {/* SIDEBAR (desktop) */}
          <div className="sidebar">
            <div className="sidebar-user" onClick={() => setPanel("profile")}>
              <div className="user-avatar">
                {profile.photo ? <img src={profile.photo} alt="avatar"/> : "🌱"}
              </div>
              <div>
                <div className="user-name">{displayName}</div>
                <div className="user-status">● En línea</div>
              </div>
            </div>

            <div className="nav-section">Principal</div>
            {[
              { id:"kindreds",      icon:"✨", label:"Kindreds",       badge: showList.length },
              { id:"conversations", icon:"💬", label:"Conversaciones", badge: DEMO_MATCHES.filter(m=>m.unread).length },
              { id:"test",          icon:"🧠", label:"Test",           badge: 0 },
              { id:"profile",       icon:"👤", label:"Tú",             badge: 0 },
            ].map(item => (
              <div key={item.id} className={`nav-item ${panel===item.id?"active":""}`} onClick={() => { setPanel(item.id); setActiveConvo(null); }}>
                <span className="icon">{item.icon}</span>
                {item.label}
                {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
              </div>
            ))}

            <div className="nav-section" style={{marginTop:16}}>Cuenta</div>
            <div className="nav-item" onClick={() => setShowTour(true)}>
              <span className="icon">💡</span> Cómo funciona
            </div>
            <div className="nav-item" onClick={handleLogout}>
              <span className="icon">🚪</span> Salir
            </div>
          </div>

          {/* BOTTOM NAV (mobile) */}
          <nav className="bottom-nav">
            <div className="bottom-nav-inner">
              {[
                { id:"kindreds",      icon:"✨", label:"Kindreds",    badge: showList.length },
                { id:"conversations", icon:"💬", label:"Chats",       badge: DEMO_MATCHES.filter(m=>m.unread).length },
                { id:"test",          icon:"🧠", label:"Test",        badge: 0 },
                { id:"profile",       icon:"👤", label:"Perfil",      badge: 0 },
                { id:"logout",        icon:"🚪", label:"Salir",       badge: 0 },
              ].map(item => (
                <button
                  key={item.id}
                  className={`bottom-tab ${panel===item.id?"active":""}`}
                  onClick={() => item.id === "logout" ? handleLogout() : (setPanel(item.id), setActiveConvo(null))}
                >
                  <div className="tab-icon-wrap">
                    <span className="tab-icon">{item.icon}</span>
                    {item.badge > 0 && <span className="tab-badge">{item.badge}</span>}
                  </div>
                  <span className="tab-label">{item.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* MAIN */}
          <div className={`main ${panel === "conversations" ? "main-fit" : ""}`}>

            {/* KINDREDS */}
            {panel === "kindreds" && (
              <>
                <h2 className="panel-title">Tus <em>kindreds</em></h2>
                <p className="panel-sub">
                  {isRealData ? `${nearbyProfiles.length} personas cerca de ti` : "Personas con quienes tienes algo real en común."}
                </p>

                {!userLocation && (
                  <div className="location-banner">
                    <span>📍</span>
                    <div><strong>Activa tu ubicación</strong>para ver personas cerca de ti</div>
                    <button className="btn-pill" style={{fontSize:13,padding:"8px 18px"}} onClick={requestLocation}>Activar</button>
                  </div>
                )}

                <div className="kindreds-grid">
                  {showCards && showList.map((m, i) => (
                    <div key={m.id || i} className="k-card">
                      {/* Avatar anónimo — foto y nombre se revelan solo al conectar */}
                      <div className="k-avatar" style={{background:"rgba(193,122,90,.12)",fontSize:22}}>
                        🌱
                      </div>
                      <div className="k-name" style={{color:"var(--soft)",fontStyle:"italic",fontSize:15,fontFamily:"'DM Sans',sans-serif",fontWeight:400}}>Alguien cerca de ti</div>
                      <div className="k-age">
                        {isRealData && m.distance_km != null
                          ? `📍 ${m.distance_km < 1 ? "< 1 km" : `${m.distance_km} km`}${m.age ? ` · ${m.age} años` : ""}`
                          : m.age ? `${m.age} años` : ""}
                      </div>
                      {(m.reason || m.bio) && (
                        <div className="k-reason">
                          <strong>Por qué conectan</strong>
                          {m.reason || m.bio}
                        </div>
                      )}
                      {isRealData && m.interests?.length > 0 && (
                        <div className="k-tags">
                          {m.interests.slice(0,3).map(t => <span key={t} className="k-tag">{t}</span>)}
                        </div>
                      )}
                      {(() => {
                        const compat = compatOf(me, m) ?? m.compat;
                        if (compat == null) return null;
                        return (
                          <>
                            <div className="k-compat-label"><span>Compatibilidad</span><span>{compat}%</span></div>
                            <div className="k-track"><div className="k-fill" style={{width:`${compat}%`}}/></div>
                          </>
                        );
                      })()}
                      {!isRealData && (
                        <>
                          {m.reason && (
                            <div className="k-tags" style={{marginTop:8}}>
                              <span className="k-tag">Conversaciones profundas</span>
                              <span className="k-tag">Curiosidad</span>
                            </div>
                          )}
                        </>
                      )}
                      <div style={{fontSize:11,color:"var(--soft)",margin:"10px 0 4px",textAlign:"center",lineHeight:1.5}}>
                        🔒 Foto y nombre se revelan al conectar
                      </div>
                      <button className="k-btn" onClick={() => handleConnect(m)}>
                        Conectar →
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* CONVERSACIONES */}
            {panel === "conversations" && (
              <>
                <h2 className="panel-title">Tus <em>conversaciones</em></h2>
                <p className="panel-sub">Ordenadas por profundidad, no por tiempo.</p>
                <div className="convos-layout">
                  <div className="convo-list">
                    <div className="convo-list-hdr">
                      <h3>Activas</h3>
                      <p>{convoList.length} {convoList.length === 1 ? "conexión" : "conexiones"}</p>
                    </div>
                    <div className={`convo-item rl-entry ${!activeConvo ? "active" : ""}`} onClick={() => setActiveConvo(null)}>
                      <div className="ci-avatar" style={{background:"rgba(193,122,90,.14)"}}>🎡</div>
                      <div className="ci-info">
                        <div className="ci-name">Ruleta Kindred</div>
                        <div className="ci-last">Gira y conecta con alguien afín</div>
                      </div>
                      <div className="ci-meta"><span className="depth-tag">Juego</span></div>
                    </div>
                    <div className="convo-items">
                      {social.incoming.length > 0 && (
                        <>
                          <div className="cl-section">Te aceptaron 💌</div>
                          {social.incoming.map(p => (
                            <div key={p.id} className="convo-item" onClick={() => setAcceptTarget(p)}>
                              <div className="ci-avatar" style={{background:"rgba(193,122,90,.14)"}}>💌</div>
                              <div className="ci-info">
                                <div className="ci-name">Alguien quiere conversar</div>
                                <div className="ci-last">Toca para ver quién es</div>
                              </div>
                              <div className="ci-meta"><span className="depth-tag">Nuevo</span></div>
                            </div>
                          ))}
                        </>
                      )}
                      {pendingList.length > 0 && (
                        <>
                          <div className="cl-section">Esperando respuesta ⏳</div>
                          {pendingList.map(p => (
                            <div key={p.id} className="convo-item cl-pending">
                              <div className="ci-avatar" style={{background:p.bg || "rgba(193,122,90,.14)"}}>
                                {p.avatar_url
                                  ? <img src={p.avatar_url} alt="" style={{width:"100%",height:"100%",borderRadius:"50%",objectFit:"cover"}}/>
                                  : (p.avatar || (p.nickname || p.name || "K")[0].toUpperCase())}
                              </div>
                              <div className="ci-info">
                                <div className="ci-name">{p.nickname || p.name || "Kindred"}</div>
                                <div className="ci-last">Cuando también acepte, se abre el chat</div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                      {convoList.length === 0 && (
                        <div style={{padding:"1.5rem 1rem",textAlign:"center",color:"var(--soft)",fontSize:13}}>
                          Aún no tienes matches.<br/>Inicia una conversación desde Kindreds.
                        </div>
                      )}
                      {convoList.map(m => (
                        <div key={m.id} className={`convo-item ${activeConvo?.id===m.id?"active":""}`} onClick={() => openConvo(m)}>
                          <div className="ci-avatar" style={{background:m.bg}}>{m.avatar_url ? <img src={m.avatar_url} style={{width:"100%",height:"100%",borderRadius:"50%",objectFit:"cover"}}/> : m.avatar}</div>
                          <div className="ci-info">
                            <div className="ci-name">{m.name}</div>
                            <div className="ci-last">{(chatMsgs[m.matchId||m.id]||[]).slice(-1)[0]?.text || m.msgs?.slice(-1)[0]?.text || "Toca para empezar"}</div>
                          </div>
                          <div className="ci-meta">
                            <span className="depth-tag">{m.depth}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Desktop inline chat */}
                  <div className={`chat-panel ${!activeConvo ? "rl-pane" : ""}`} style={{display: activeConvo ? "flex" : "flex"}}>
                    {!activeConvo ? (
                      <KindredRoulette
                        key={rouletteKey}
                        excludeIds={skippedIds}
                        initialNotice={rouletteNotice}
                        onNoticeShown={() => setRouletteNotice("")}
                        candidates={[...(fran ? [fran] : []), ...(isRealData ? visibleNearby : DEMO_MATCHES)]}
                        testMode={SHOW_FRAN}
                        me={me}
                        onConnect={handleConnect}
                        onGoTest={() => setPanel("test")}
                      />
                    ) : (
                      <>
                        <div className="chat-hdr" style={{display:"none"}} id="desktop-chat-hdr-placeholder"/>
                        <div className="chat-hdr">
                          <div className="chat-hdr-avatar" style={{background:activeConvo.bg}}>{activeConvo.avatar}</div>
                          <div>
                            <div className="chat-hdr-name">{activeConvo.name}</div>
                            <div className="chat-hdr-status">En línea · {activeConvo.depth}</div>
                          </div>
                        </div>
                        <div className="chat-msgs">
                          {pendingProposal && pendingProposal.proposed_by !== authUser?.id && (
                            <div className="prompt-box" style={{borderLeft:"3px solid var(--terra)"}}>
                              <small style={{textTransform:"uppercase",letterSpacing:"1px",fontSize:10,opacity:.6}}>
                                {TOPIC_TYPE_META[pendingProposal.topic_type]?.icon} {TOPIC_TYPE_META[pendingProposal.topic_type]?.label}
                              </small>
                              <p style={{margin:"6px 0"}}>"{pendingProposal.topic_text}"</p>
                              <div style={{display:"flex",gap:8,marginTop:8}}>
                                <button className="c-send" style={{flex:1,borderRadius:8,fontSize:12,padding:"6px 0"}}
                                  onClick={() => handleRespondProposal(pendingProposal.id, true)}>
                                  Acepto este tema ✓
                                </button>
                                <button className="c-send" style={{flex:"0 0 auto",background:"none",color:"var(--soft)",border:"0.5px solid var(--soft)",borderRadius:8,fontSize:12,padding:"6px 12px"}}
                                  onClick={() => handleRespondProposal(pendingProposal.id, false)}>
                                  Paso
                                </button>
                              </div>
                            </div>
                          )}
                          {pendingProposal === null && (chatMsgs[activeConvo.matchId||activeConvo.id]||[]).length === 0 && (
                            <div className="prompt-box">
                              <p style={{opacity:.5,fontStyle:"italic",fontSize:13}}>Todavía no hay mensajes. ¡Empieza la conversación o propón un tema!</p>
                            </div>
                          )}
                          {(chatMsgs[activeConvo.matchId||activeConvo.id]||[]).map(m => (
                            <div key={m.id} className={`msg ${m.type==="sent"?"sent":"recv"}`}>
                              {m.isTopic && (
                                <div className="prompt-box" style={{borderLeft:"3px solid #1D9E75",marginBottom:8}}>
                                  <small style={{textTransform:"uppercase",letterSpacing:"1px",fontSize:10,color:"var(--green)"}}>Tema acordado</small>
                                  <p style={{margin:"4px 0",fontSize:14}}>"{m.text}"</p>
                                </div>
                              )}
                              {!m.isTopic && <div className="bubble">{m.text}</div>}
                              {m.time && <span className="msg-time">{m.time}</span>}
                            </div>
                          ))}
                          <div ref={endRef}/>
                        </div>
                        {showTopicPicker && topicOptions && (
                          <div style={{padding:"12px 16px",borderTop:"0.5px solid var(--line)",background:"var(--bg)"}}>
                            <div style={{fontSize:11,opacity:.5,marginBottom:8,textTransform:"uppercase",letterSpacing:"1px"}}>Elegí un tema para proponer</div>
                            {topicOptions.topics.map(t => (
                              <div key={t.id}
                                onClick={() => handleProposeTopic(t)}
                                style={{padding:"10px 12px",marginBottom:6,borderRadius:8,border:"0.5px solid var(--line)",cursor:"pointer",fontSize:13,lineHeight:1.5}}>
                                <span style={{fontSize:11,opacity:.5,marginRight:6}}>{TOPIC_TYPE_META[t.type]?.icon}</span>
                                {t.text}
                              </div>
                            ))}
                            <button onClick={() => setShowTopicPicker(false)}
                              style={{width:"100%",marginTop:4,padding:"6px 0",fontSize:12,opacity:.4,background:"none",border:"none",cursor:"pointer"}}>
                              Cancelar
                            </button>
                          </div>
                        )}
                        <div className="chat-input-area">
                          {!pendingProposal && activeConvo.matchId && (
                            <button title="Proponer tema"
                              onClick={() => { setShowTopicPicker(v => !v); if(!topicOptions) loadTopicOptions(); }}
                              style={{background:"none",border:"0.5px solid var(--line)",borderRadius:8,padding:"0 10px",fontSize:16,cursor:"pointer",flexShrink:0,color:"var(--terra)"}}>
                              💡
                            </button>
                          )}
                          <textarea className="c-inp" placeholder="Escribe algo real..."
                            value={msgInput}
                            onChange={e => setMsgInput(e.target.value)}
                            onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg();} }}
                            rows={1}/>
                          <button className="c-send" onClick={sendMsg}>→</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Mobile full-screen chat overlay */}
                {activeConvo && (
                  <div className="chat-panel-mobile-overlay">
                    <div className="chat-mobile-back">
                      <button onClick={() => setActiveConvo(null)}>←</button>
                      <div className="chat-hdr-avatar" style={{background:activeConvo.bg,width:36,height:36,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{activeConvo.avatar}</div>
                      <div>
                        <div className="chat-hdr-name">{activeConvo.name}</div>
                        <div className="chat-hdr-status" style={{color:"var(--green)",fontSize:11}}>En línea · {activeConvo.depth}</div>
                      </div>
                    </div>
                    <div className="chat-msgs" style={{flex:1,overflow:"auto",padding:"16px 16px",display:"flex",flexDirection:"column",gap:12,background:"var(--cream)"}}>
                      {pendingProposal && pendingProposal.proposed_by !== authUser?.id && (
                        <div className="prompt-box" style={{borderLeft:"3px solid var(--terra)"}}>
                          <p style={{margin:"6px 0"}}>"{pendingProposal.topic_text}"</p>
                          <div style={{display:"flex",gap:8,marginTop:8}}>
                            <button className="c-send" style={{flex:1,borderRadius:8,fontSize:12,padding:"6px 0"}} onClick={() => handleRespondProposal(pendingProposal.id, true)}>Acepto ✓</button>
                            <button className="c-send" style={{flex:"0 0 auto",background:"none",color:"var(--soft)",border:"0.5px solid var(--soft)",borderRadius:8,fontSize:12,padding:"6px 12px"}} onClick={() => handleRespondProposal(pendingProposal.id, false)}>Paso</button>
                          </div>
                        </div>
                      )}
                      {(chatMsgs[activeConvo.matchId||activeConvo.id]||[]).length === 0 && !pendingProposal && (
                        <div className="prompt-box"><p style={{opacity:.5,fontStyle:"italic",fontSize:13}}>¡Empieza la conversación!</p></div>
                      )}
                      {(chatMsgs[activeConvo.matchId||activeConvo.id]||[]).map(m => (
                        <div key={m.id} className={`msg ${m.type==="sent"?"sent":"recv"}`}>
                          {!m.isTopic && <div className="bubble">{m.text}</div>}
                          {m.time && <span className="msg-time">{m.time}</span>}
                        </div>
                      ))}
                      <div ref={endRef}/>
                    </div>
                    <div className="chat-input-area" style={{padding:"12px 16px",paddingBottom:"max(12px,env(safe-area-inset-bottom,12px))"}}>
                      <textarea className="c-inp" placeholder="Escribe algo real..."
                        value={msgInput}
                        onChange={e => setMsgInput(e.target.value)}
                        onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg();} }}
                        rows={1}/>
                      <button className="c-send" onClick={sendMsg}>→</button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TEST DE PERSONALIDAD */}
            {panel === "test" && <PersonalityTest me={me} onSaveMe={handleSaveMe} />}

            {/* PERFIL */}
            {panel === "profile" && (
              <>
                <h2 className="panel-title">Tu <em>perfil</em></h2>
                <p className="panel-sub">Así te ven los demás — y así te ves tú.</p>

                <input ref={photoRef} type="file" accept="image/*" style={{display:"none"}} onChange={handlePhotoChange}/>

                <div className="profile-wrap">
                  <div className="profile-hero">
                    <div className="profile-photo-wrap">
                      <div className="profile-photo" onClick={() => photoRef.current?.click()}>
                        {profile.photo ? <img src={profile.photo} alt="perfil"/> : "🌱"}
                        <div className="photo-overlay">📷</div>
                      </div>
                      <div className="profile-photo-hint">Toca para cambiar la foto</div>
                    </div>

                    <div style={{flex:1}}>
                      <div style={{marginBottom:12}}>
                        <div className="inline-field-label">Apodo</div>
                        <input className="inline-input inline-input-lg"
                          placeholder="¿Cómo te gusta que te llamen?"
                          value={profile.nickname}
                          onChange={e => setProfile(p => ({...p, nickname:e.target.value}))}/>
                      </div>
                      <div>
                        <div className="inline-field-label">Sobre ti</div>
                        <textarea className="inline-input inline-textarea"
                          placeholder="Una frase que te describa... lo auténtico conecta."
                          value={profile.bio}
                          onChange={e => setProfile(p => ({...p, bio:e.target.value}))}
                          rows={3}/>
                      </div>
                    </div>
                  </div>

                  {/* Relationship status */}
                  <div className="profile-section">
                    <div className="profile-section-title">Estado sentimental</div>
                    <div className="chip-group">
                      {[
                        { value:"single",        label:"Soltero/a",          icon:"🌱" },
                        { value:"dating",        label:"Saliendo con alguien",icon:"🌿" },
                        { value:"open",          label:"Relación abierta",    icon:"🌸" },
                        { value:"complicated",   label:"Es complicado",       icon:"🌀" },
                        { value:"not-looking",   label:"No busco nada",       icon:"🪨" },
                        { value:"prefer-not",    label:"Prefiero no decirlo", icon:"·" },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          className={`chip ${profile.relationshipStatus === opt.value ? "chip-sel" : ""}`}
                          onClick={() => setProfile(p => ({...p, relationshipStatus: p.relationshipStatus === opt.value ? "" : opt.value}))}
                        >
                          <span>{opt.icon}</span> {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Interested in */}
                  <div className="profile-section">
                    <div className="profile-section-title">Me interesan conexiones con</div>
                    <div className="chip-group">
                      {[
                        { value:"women",      label:"Mujeres",           icon:"♀" },
                        { value:"men",        label:"Hombres",           icon:"♂" },
                        { value:"nonbinary",  label:"Personas no binarias",icon:"◈" },
                        { value:"everyone",   label:"Todas las personas", icon:"∞" },
                      ].map(opt => {
                        const sel = profile.interestedIn.includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            className={`chip ${sel ? "chip-sel" : ""}`}
                            onClick={() => setProfile(p => ({
                              ...p,
                              interestedIn: sel
                                ? p.interestedIn.filter(v => v !== opt.value)
                                : [...p.interestedIn, opt.value]
                            }))}
                          >
                            <span>{opt.icon}</span> {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Intereses */}
                  <div className="profile-section">
                    <div className="profile-section-title">Mis intereses</div>
                    {profile.interests.length > 0 && (
                      <div className="interests-list" style={{marginBottom:12}}>
                        {profile.interests.map(tag => (
                          <span key={tag} className="interest-tag-edit">
                            {tag}
                            <button onClick={() => setProfile(p => ({...p, interests:p.interests.filter(i=>i!==tag)}))}>✕</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="interests-input-row">
                      <input className="inline-input"
                        placeholder="Agrega un interés y presiona Enter..."
                        value={interestInput}
                        onChange={e => setInterestInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const v = interestInput.trim();
                            if (v && !profile.interests.includes(v)) setProfile(p => ({...p, interests:[...p.interests,v]}));
                            setInterestInput("");
                          }
                        }}/>
                      <button className="btn-add-interest" onClick={() => {
                        const v = interestInput.trim();
                        if (v && !profile.interests.includes(v)) setProfile(p => ({...p, interests:[...p.interests,v]}));
                        setInterestInput("");
                      }}>+ Agregar</button>
                    </div>
                  </div>

                  <div className="profile-saved-hint">Los cambios se guardan automáticamente ✓</div>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}