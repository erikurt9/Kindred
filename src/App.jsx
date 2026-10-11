import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./lib/supabase";
import { signUp, signIn, signOut, getProfile, upsertProfile, uploadPhoto, saveAnswers, getNearbyProfiles, sendLike, getMatches, getMessages, sendMessage, subscribeToMessages, proposeTopic, respondToProposal, getPendingProposal, subscribeToProposals, selectTopics, TOPIC_TYPE_META } from "./lib/api";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  :root {
    --cream:#F6F1E9; --warm:#EDE4D4; --terra:#C17A5A; --terra-l:#D4956F;
    --dark:#2C2420; --mid:#6B5B52; --soft:#A89080; --green:#7A9E7E; --white:#fff;
  }
  html,body { height:100%; }
  body { font-family:'DM Sans',sans-serif; background:var(--cream); color:var(--dark); min-height:100vh; overflow-x:hidden; }

  .blob { position:fixed; border-radius:50%; filter:blur(120px); pointer-events:none; z-index:0; }
  .blob-a { width:700px;height:700px;background:var(--terra);opacity:.15;top:-200px;right:-150px;animation:b1 14s ease-in-out infinite; }
  .blob-b { width:500px;height:500px;background:var(--green);opacity:.12;bottom:-120px;left:-100px;animation:b2 17s ease-in-out infinite; }
  .blob-c { width:350px;height:350px;background:#D4A574;opacity:.10;top:40%;left:40%;animation:b3 11s ease-in-out infinite; }
  @keyframes b1{0%,100%{transform:translate(0,0)scale(1)}50%{transform:translate(-40px,50px)scale(1.07)}}
  @keyframes b2{0%,100%{transform:translate(0,0)scale(1)}50%{transform:translate(50px,-40px)scale(1.05)}}
  @keyframes b3{0%,100%{transform:translate(0,0)scale(1)}50%{transform:translate(-25px,25px)scale(.94)}}

  .nav { position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(246,241,233,.82);backdrop-filter:blur(20px);border-bottom:1px solid rgba(237,228,212,.6); }
  .nav-inner { max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:20px 48px; }
  .logo { font-family:'Lora',serif;font-size:22px;letter-spacing:-.5px;color:var(--dark);cursor:pointer;user-select:none; }
  .logo em { color:var(--terra);font-style:italic; }
  .nav-r { display:flex;gap:10px;align-items:center; }
  .btn-ghost { background:none;border:none;font-family:'DM Sans',sans-serif;font-size:14px;color:var(--mid);cursor:pointer;padding:9px 18px;border-radius:100px;transition:.2s; }
  .btn-ghost:hover { background:var(--warm);color:var(--dark); }
  .btn-pill { background:var(--terra);border:none;color:white;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;padding:10px 26px;border-radius:100px;transition:.25s;box-shadow:0 4px 18px rgba(193,122,90,.28); }
  .btn-pill:hover { background:var(--terra-l);transform:translateY(-1px);box-shadow:0 8px 26px rgba(193,122,90,.38); }
  .btn-pill:disabled { opacity:.4;cursor:not-allowed;transform:none;box-shadow:none; }

  .landing-wrap { min-height:100vh;padding-top:72px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;text-align:center; }
  .hero-content { position:relative;z-index:5;display:flex;flex-direction:column;align-items:center;max-width:720px;width:100%;padding:0 32px; }
  .callout { display:inline-flex;align-items:center;gap:10px;background:rgba(255,255,255,.55);backdrop-filter:blur(10px);border:1px solid rgba(193,122,90,.22);border-radius:100px;padding:8px 18px;font-size:13px;color:var(--mid);margin-bottom:28px;animation:fadeUp .5s ease both; }
  .callout .strike { text-decoration:line-through;opacity:.5; }
  .callout .arr { color:var(--terra);font-weight:600; }
  .h1 { font-family:'Lora',serif;font-size:clamp(44px,6vw,80px);line-height:1.08;letter-spacing:-2.5px;color:var(--dark);margin-bottom:24px;animation:fadeUp .5s ease .1s both; }
  .h1 em { color:var(--terra);font-style:italic; }
  .hero-p { font-size:18px;color:var(--mid);line-height:1.75;max-width:520px;font-weight:300;margin-bottom:40px;animation:fadeUp .5s ease .2s both; }
  .cta-row { display:flex;gap:14px;justify-content:center;margin-bottom:64px;animation:fadeUp .5s ease .3s both; }
  .btn-big { font-size:16px;padding:14px 36px; }
  .btn-outline { background:rgba(255,255,255,.45);border:1.5px solid rgba(237,228,212,.9);color:var(--mid);font-family:'DM Sans',sans-serif;font-size:16px;cursor:pointer;padding:14px 36px;border-radius:100px;transition:.2s;backdrop-filter:blur(8px); }
  .btn-outline:hover { border-color:var(--terra);color:var(--terra); }
  .feats { position:relative;z-index:5;display:flex;justify-content:center;gap:36px;flex-wrap:wrap;padding:0 32px 48px;animation:fadeUp .5s ease .4s both; }
  .feat { display:flex;align-items:center;gap:12px;font-size:14px;color:var(--mid); }
  .feat-icon { width:36px;height:36px;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 12px rgba(0,0,0,.07);flex-shrink:0; }

  .overlay { position:fixed;inset:0;z-index:200;background:rgba(44,36,32,.5);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn .2s ease both; }
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  .demo-modal { background:white;border-radius:28px;width:100%;max-width:960px;max-height:88vh;box-shadow:0 40px 100px rgba(44,36,32,.2);display:grid;grid-template-columns:340px 1fr;overflow:hidden;animation:slideUp .3s ease both; }
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
  .how-num   { width:26px;height:26px;border-radius:50%;background:var(--terra);color:white;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px; }
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
  .sent .d-bub { background:var(--terra);color:white;border-bottom-right-radius:4px; }
  .recv .d-bub { background:var(--cream);color:var(--dark);border-bottom-left-radius:4px; }
  .d-time { font-size:10px;color:var(--soft);margin-top:3px;padding:0 3px; }
  .typing { display:flex;align-items:center;gap:5px;padding:11px 15px;background:var(--cream);border-radius:16px;border-bottom-left-radius:4px;width:fit-content; }
  .typing span { width:6px;height:6px;border-radius:50%;background:var(--soft);animation:bounce 1.2s ease-in-out infinite; }
  .typing span:nth-child(2){animation-delay:.2s} .typing span:nth-child(3){animation-delay:.4s}
  @keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
  .demo-input-row { padding:14px 24px 20px;border-top:1px solid var(--warm);display:flex;gap:10px;align-items:flex-end;flex-shrink:0;background:white; }
  .d-inp { flex:1;background:var(--cream);border:1.5px solid var(--warm);border-radius:20px;padding:10px 16px;font-family:'DM Sans',sans-serif;font-size:14px;color:var(--dark);outline:none;resize:none;max-height:80px;transition:border-color .2s; }
  .d-inp:focus { border-color:var(--terra); }
  .d-inp::placeholder { color:var(--soft); }
  .d-send { width:40px;height:40px;border-radius:50%;background:var(--terra);border:none;color:white;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:.2s; }
  .d-send:hover { background:var(--terra-l);transform:scale(1.05); }

  .screen-center { min-height:100vh;display:flex;align-items:center;justify-content:center;padding:100px 24px 40px;position:relative; }
  .card { background:white;border-radius:28px;padding:52px;max-width:560px;width:100%;box-shadow:0 24px 64px rgba(44,36,32,.09);position:relative;z-index:5;animation:fadeUp .5s ease both; }
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

  .auth-card { background:white;border-radius:28px;padding:52px 48px;max-width:480px;width:100%;box-shadow:0 24px 64px rgba(44,36,32,.09);position:relative;z-index:5;animation:fadeUp .5s ease both; }
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
  .sidebar { background:white;border-right:1px solid var(--warm);padding:28px 16px;position:sticky;top:72px;height:calc(100vh - 72px);overflow-y:auto;display:flex;flex-direction:column;gap:4px;z-index:5; }
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
  .nav-badge { margin-left:auto;background:var(--terra);color:white;font-size:10px;font-weight:600;padding:2px 7px;border-radius:100px; }

  .main { padding:40px 52px;min-height:calc(100vh - 72px);overflow-y:auto;position:relative;z-index:5; }
  .panel-title { font-family:'Lora',serif;font-size:32px;color:var(--dark);margin-bottom:6px; }
  .panel-title em { color:var(--terra);font-style:italic; }
  .panel-sub { font-size:15px;color:var(--mid);margin-bottom:36px; }

  .location-banner { display:flex;align-items:center;gap:14px;background:rgba(122,158,126,.1);border:1px solid rgba(122,158,126,.25);border-radius:16px;padding:16px 20px;margin-bottom:24px; }
  .location-banner span { font-size:20px;flex-shrink:0; }
  .location-banner div { flex:1;font-size:13px;color:var(--mid); }
  .location-banner strong { display:block;font-size:14px;color:var(--dark);margin-bottom:2px; }

  .kindreds-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px; }
  .k-card { background:white;border-radius:22px;padding:28px;box-shadow:0 8px 32px rgba(44,36,32,.07);transition:.25s;animation:fadeUp .5s ease both; }
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
  .convo-list { background:white;border-right:1px solid var(--warm);display:flex;flex-direction:column; }
  .convo-list-hdr { padding:20px 20px 16px;border-bottom:1px solid var(--warm); }
  .convo-list-hdr h3 { font-family:'Lora',serif;font-size:18px;color:var(--dark); }
  .convo-list-hdr p  { font-size:12px;color:var(--soft);margin-top:2px; }
  .convo-items { flex:1;overflow-y:auto; }
  .convo-item { display:flex;align-items:center;gap:12px;padding:14px 20px;cursor:pointer;transition:.2s;border-bottom:1px solid rgba(237,228,212,.5); }
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
  .chat-hdr   { padding:18px 28px;border-bottom:1px solid var(--warm);background:white;display:flex;align-items:center;gap:14px;flex-shrink:0; }
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
  .sent .bubble { background:var(--terra);color:white;border-bottom-right-radius:4px; }
  .recv .bubble { background:white;color:var(--dark);border-bottom-left-radius:4px;box-shadow:0 2px 10px rgba(0,0,0,.06); }
  .msg-time { font-size:10px;color:var(--soft);margin-top:3px;padding:0 4px; }
  .chat-input-area { padding:16px 28px;border-top:1px solid var(--warm);background:white;display:flex;gap:10px;align-items:flex-end;flex-shrink:0; }
  .c-inp    { flex:1;background:var(--cream);border:1.5px solid var(--warm);border-radius:20px;padding:11px 18px;font-family:'DM Sans',sans-serif;font-size:14px;color:var(--dark);outline:none;resize:none;max-height:100px;transition:border-color .2s; }
  .c-inp:focus { border-color:var(--terra); }
  .c-inp::placeholder { color:var(--soft); }
  .c-send   { width:42px;height:42px;border-radius:50%;background:var(--terra);border:none;color:white;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:.2s; }
  .c-send:hover { background:var(--terra-l);transform:scale(1.05); }
  .empty-chat { flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--soft); }
  .empty-chat span { font-size:40px; }
  .empty-chat p { font-size:14px;text-align:center;max-width:240px;line-height:1.6; }

  .profile-wrap { max-width:680px;margin:0 auto;animation:fadeUp .4s ease both; }
  .profile-hero { background:white;border-radius:24px;padding:36px;box-shadow:0 8px 32px rgba(44,36,32,.07);margin-bottom:16px;display:flex;gap:32px;align-items:flex-start; }
  .profile-photo-wrap { flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:10px; }
  .profile-photo { width:110px;height:110px;border-radius:50%;background:rgba(193,122,90,.15);display:flex;align-items:center;justify-content:center;font-size:44px;overflow:hidden;border:3px solid var(--warm);cursor:pointer;transition:.2s;position:relative; }
  .profile-photo:hover { border-color:var(--terra); }
  .profile-photo:hover .photo-overlay { opacity:1; }
  .profile-photo img { width:100%;height:100%;object-fit:cover; }
  .photo-overlay { position:absolute;inset:0;border-radius:50%;background:rgba(44,36,32,.45);display:flex;align-items:center;justify-content:center;font-size:22px;opacity:0;transition:.2s; }
  .profile-photo-hint { font-size:11px;color:var(--soft);text-align:center;max-width:90px;line-height:1.4; }
  .profile-section { background:white;border-radius:20px;padding:28px 32px;box-shadow:0 8px 32px rgba(44,36,32,.07);margin-bottom:12px; }
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
  .btn-add-interest { background:var(--terra);border:none;color:white;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;padding:0 18px;border-radius:12px;transition:.2s;white-space:nowrap;flex-shrink:0; }
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
    border-top:1px solid rgba(237,228,212,.6);
    padding:0;
    padding-bottom:env(safe-area-inset-bottom,0);
    box-shadow:0 -1px 0 rgba(237,228,212,.5), 0 -12px 40px rgba(44,36,32,.07);
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
    background:var(--terra);color:white;
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
      padding:12px 16px;background:white;
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
  { id:1, name:"Valentina", age:24, avatar:"🌿", bg:"#E8F4E8", reason:"Los dos son noctámbulos curiosos que hablan solos cuando piensan", compat:87, msgs:[{id:1,type:"recv",text:"Las mejores cosas pasan cuando no las planeas.",time:"10:24"}], depth:"Nivel 2", unread:true },
  { id:2, name:"Sofía",     age:22, avatar:"🎵", bg:"#F4EEE8", reason:"Ambas valoran las conversaciones profundas sobre las superficiales",   compat:82, msgs:[{id:1,type:"recv",text:"¿Cuál fue el último libro que te cambió algo?",time:"Ayer"}],  depth:"Nivel 1", unread:true },
  { id:3, name:"Camila",    age:25, avatar:"🌙", bg:"#EEE8F4", reason:"Comparten esa sensación de observar antes de participar en grupos",    compat:79, msgs:[], depth:"Nuevo", unread:false },
  { id:4, name:"Isidora",   age:23, avatar:"☕", bg:"#F4F0E8", reason:"Las dos prefieren una conversación lenta a un montón de mensajes rápidos", compat:76, msgs:[], depth:"Nuevo", unread:false },
];

const DEMO_SCRIPT = [
  { type:"recv", text:"¿Qué harías si tuvieras un día completamente libre, sin planes ni obligaciones?", delay:500 },
  { type:"sent", text:"Empezaría caminando sin rumbo. Las mejores cosas que me han pasado fueron cuando no las planeé.", delay:2000 },
  { type:"recv", text:"Eso me dice mucho de ti 🌿 La mente necesita ese espacio sin agenda para encontrar lo que realmente quiere.", delay:2600 },
  { type:"sent", text:"Exacto. Cuando tengo todo planificado siento que estoy cumpliendo tareas, no viviendo.", delay:2200 },
  { type:"recv", text:"¿Y cuándo fue la última vez que te perdiste así, sin rumbo?", delay:1800 },
];

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
  const [userForm, setUserForm]   = useState({ name:"", email:"", password:"" });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [profile, setProfile]     = useState({ nickname:"", bio:"", interests:[], photo:null, relationshipStatus:"", interestedIn:[] });
  const [interestInput, setInterestInput] = useState("");
  const [nearbyProfiles, setNearbyProfiles] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [realMatches, setRealMatches] = useState([]);
  const [pendingProposal, setPendingProposal] = useState(null);
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
      if (data) setProfile({ nickname: data.nickname||"", bio: data.bio||"", interests: data.interests||[], photo: data.avatar_url||null, relationshipStatus: data.relationship_status||"", interestedIn: data.interested_in||[] });
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
      const data = await signUp(userForm.email, userForm.password, userForm.name);
      setAuthUser(data.user);
      if (data.user && Object.keys(answers).length > 0) {
        await saveAnswers(data.user.id, answers);
        // Guardar scores OCEAN derivados en el perfil
        const oceanScores = deriveOceanFromAnswers(answers);
        await upsertProfile(data.user.id, oceanScores);
      }
      setScreen("dashboard");
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
    setUserForm({ name:"", email:"", password:"" });
    setProfile({ nickname:"", bio:"", interests:[], photo:null });
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
    }
    setTimeout(() => endRef.current?.scrollIntoView({behavior:"smooth"}), 50);
  };

  const loadMatches = async (userId) => {
    try {
      const matches = await getMatches(userId);
      setRealMatches(matches.map(m => ({
        id: m.matchId, matchId: m.matchId,
        name: m.profile.nickname || m.profile.name || "Kindred",
        avatar: (m.profile.nickname || m.profile.name || "K")[0].toUpperCase(),
        bg: "#EEEDFE", depth: "Nueva conexión", avatar_url: m.profile.avatar_url,
      })));
    } catch(e) { console.error("loadMatches:", e); }
  };

  // Carga opciones de tema según OCEAN de ambos perfiles
  const loadTopicOptions = async () => {
    if (!activeConvo?.matchId || !authUser) return;
    try {
      const myProfile = await import('./lib/api').then(() => ({ ocean_o: 50, ocean_c: 50, ocean_e: 50, ocean_a: 50, ocean_n: 50 }));
      const theirProfileData = realMatches.find(m => m.matchId === activeConvo.matchId);
      const opts = selectTopics(myProfile, theirProfileData?.profile || {});
      setTopicOptions(opts);
    } catch(e) { console.error("loadTopicOptions:", e); }
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

  const startConvo = async (otherProfile) => {
    setPanel("conversations");
    if (!authUser) return;
    try {
      const { matched } = await sendLike(authUser.id, otherProfile.id);
      if (matched) {
        await loadMatches(authUser.id);
      } else {
        const fakeConvo = {
          id: otherProfile.id, matchId: null,
          name: otherProfile.nickname || otherProfile.name || "Kindred",
          avatar: (otherProfile.nickname || otherProfile.name || "K")[0].toUpperCase(),
          bg: "#EEEDFE", depth: "Like enviado ✓", msgs: [],
        };
        setActiveConvo(fakeConvo);
      }
    } catch(e) { console.error("startConvo:", e); }
  };

  // Onboarding
  const q    = QUESTIONS[step] || QUESTIONS[0];
  const prog = (step / QUESTIONS.length) * 100;
  const answer = v => { setAnswers(a => ({ ...a, [q.id]: v })); setSelOpt(v); };
  const nextQ  = () => { if (step < QUESTIONS.length-1) { setStep(s=>s+1); setSelOpt(answers[QUESTIONS[step+1]?.id]||null); } else setScreen("register"); };
  const answerAndAdvance = v => { answer(v); setTimeout(nextQ, 300); };
  const backQ  = () => { if (step > 0) { setStep(s=>s-1); setSelOpt(answers[QUESTIONS[step-1]?.id]||null); } else setScreen("landing"); };

  const displayName = profile.nickname || userForm.name || "Tú";
  const showList    = nearbyProfiles.length > 0 ? nearbyProfiles : DEMO_MATCHES;
  const isRealData  = nearbyProfiles.length > 0;

  return (
    <div>
      <style>{css}</style>
      <div className="blob blob-a"/>
      <div className="blob blob-b"/>
      <div className="blob blob-c"/>
      {showDemo && <DemoModal onClose={() => setShowDemo(false)}/>}

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
                <div style={{fontSize:14,color:"var(--mid)"}}>Hola, <strong style={{color:"var(--dark)"}}>{userForm.name||"tú"}</strong> 👋</div>
              )}
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
              <label>Email</label>
              <input type="email" placeholder="tu@email.com" value={userForm.email} onChange={e => setUserForm(f=>({...f,email:e.target.value}))}/>
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input type="password" placeholder="Mínimo 8 caracteres" value={userForm.password} onChange={e => setUserForm(f=>({...f,password:e.target.value}))}/>
            </div>
            {authError && <div className="auth-error">{authError}</div>}
            <button className="btn-pill auth-btn"
              disabled={authLoading||!userForm.name||!userForm.email||!userForm.password}
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
              { id:"profile",       icon:"👤", label:"Tú",             badge: 0 },
            ].map(item => (
              <div key={item.id} className={`nav-item ${panel===item.id?"active":""}`} onClick={() => setPanel(item.id)}>
                <span className="icon">{item.icon}</span>
                {item.label}
                {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
              </div>
            ))}

            <div className="nav-section" style={{marginTop:16}}>Cuenta</div>
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
          <div className="main">

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
                          ? `📍 ${m.distance_km < 1 ? "< 1 km" : `${m.distance_km} km`}`
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
                      {!isRealData && (
                        <>
                          <div className="k-compat-label"><span>Compatibilidad</span><span>{m.compat}%</span></div>
                          <div className="k-track"><div className="k-fill" style={{width:`${m.compat}%`}}/></div>
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
                      <button className="k-btn" onClick={() => startConvo(m)}>
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
                      <p>{realMatches.length} {realMatches.length === 1 ? "conexión" : "conexiones"}</p>
                    </div>
                    <div className="convo-items">
                      {realMatches.length === 0 && (
                        <div style={{padding:"1.5rem 1rem",textAlign:"center",color:"var(--soft)",fontSize:13}}>
                          Aún no tienes matches.<br/>Inicia una conversación desde Kindreds.
                        </div>
                      )}
                      {realMatches.map(m => (
                        <div key={m.id} className={`convo-item ${activeConvo?.id===m.id?"active":""}`} onClick={() => openConvo(m)}>
                          <div className="ci-avatar" style={{background:m.bg}}>{m.avatar_url ? <img src={m.avatar_url} style={{width:"100%",height:"100%",borderRadius:"50%",objectFit:"cover"}}/> : m.avatar}</div>
                          <div className="ci-info">
                            <div className="ci-name">{m.name}</div>
                            <div className="ci-last">{(chatMsgs[m.matchId]||[]).slice(-1)[0]?.text || "Toca para empezar"}</div>
                          </div>
                          <div className="ci-meta">
                            <span className="depth-tag">{m.depth}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Desktop inline chat */}
                  <div className="chat-panel" style={{display: activeConvo ? "flex" : "flex"}}>
                    {!activeConvo ? (
                      <div className="empty-chat">
                        <span>💬</span>
                        <p>Selecciona una conversación para empezar a conectar de verdad.</p>
                      </div>
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
                                  <small style={{textTransform:"uppercase",letterSpacing:"1px",fontSize:10,color:"#0F6E56"}}>Tema acordado</small>
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