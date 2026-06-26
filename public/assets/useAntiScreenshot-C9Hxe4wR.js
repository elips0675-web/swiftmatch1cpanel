import{a as i}from"./rolldown-runtime-M0oDzQ_3.js";import{i as l}from"./animations-CzXrh6L1.js";import{t as c}from"./createLucideIcon-DEaeia5K.js";var y=[["path",{d:"M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4",key:"1slcih"}]],f=c("flame",y),u=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M8 14s1.5 2 4 2 4-2 4-2",key:"1y1vjs"}],["line",{x1:"9",x2:"9.01",y1:"9",y2:"9",key:"yxxnd0"}],["line",{x1:"15",x2:"15.01",y1:"9",y2:"9",key:"1p4y9e"}]],v=c("smile",u),t=i(l(),1),s=!1;function m(){if(s)return;s=!0;const n=document.createElement("style");n.textContent=`
    .anti-screenshot * {
      -webkit-user-select: none !important;
      user-select: none !important;
    }
    .anti-screenshot img, .anti-screenshot canvas {
      -webkit-user-drag: none !important;
      user-drag: none !important;
      -webkit-touch-callout: none !important;
    }
  `,document.head.appendChild(n)}function h(){const n=(0,t.useRef)(null);(0,t.useEffect)(()=>{m()},[]);const r=(0,t.useCallback)(e=>{e.preventDefault()},[]),a=(0,t.useCallback)(e=>{e.preventDefault()},[]),o=(0,t.useCallback)(e=>{(e.ctrlKey||e.metaKey)&&(e.key==="c"||e.key==="C"||e.key==="s"||e.key==="S"||e.key==="p"||e.key==="P"||e.key==="u"||e.key==="U")&&e.preventDefault(),(e.key==="PrintScreen"||e.key==="F12")&&e.preventDefault()},[]);return(0,t.useEffect)(()=>{const e=n.current;if(e)return e.addEventListener("contextmenu",r),e.addEventListener("copy",a),e.addEventListener("keydown",o),()=>{e.removeEventListener("contextmenu",r),e.removeEventListener("copy",a),e.removeEventListener("keydown",o)}},[r,a,o]),n}export{v as n,f as r,h as t};
