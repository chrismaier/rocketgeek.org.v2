// unhide-body-fallback.js

/* Begin body visibility failsafe */
(function(){
  'use strict';

  const fallbackDelayMilliseconds = 1400;
  const secondCheckDelayMilliseconds = 250;
  const visibilityMarkerAttribute = 'data-rg-body-unhide-fallback';

  function getBodyElement(){
    return document && document.body ? document.body : null;
  }

  function isBodyHidden(bodyElement){
    if(!bodyElement) return false;

    const computedStyle = window.getComputedStyle(bodyElement);
    const displayValue = computedStyle.display;
    const visibilityValue = computedStyle.visibility;
    const opacityValue = computedStyle.opacity;

    if(displayValue === 'none') return true;
    if(visibilityValue === 'hidden') return true;
    if(opacityValue === '0') return true;

    return false;
  }

  function forceBodyVisible(bodyElement){
    if(!bodyElement) return;
    if(bodyElement.getAttribute(visibilityMarkerAttribute) === 'true') return;

    bodyElement.style.display = 'block';
    bodyElement.style.visibility = 'visible';
    bodyElement.style.opacity = '1';
    bodyElement.setAttribute(visibilityMarkerAttribute, 'true');
  }

  function runVisibilityRescueCheck(){
    const bodyElement = getBodyElement();
    if(!bodyElement) return;

    if(isBodyHidden(bodyElement)){
      forceBodyVisible(bodyElement);
    }
  }

  function scheduleRescueChecks(){
    window.setTimeout(runVisibilityRescueCheck, fallbackDelayMilliseconds);
    window.setTimeout(
      runVisibilityRescueCheck,
      fallbackDelayMilliseconds + secondCheckDelayMilliseconds
    );
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      scheduleRescueChecks();
    });
  }else{
    scheduleRescueChecks();
  }

  window.addEventListener('load', function(){
    runVisibilityRescueCheck();
  });
})();
/* End body visibility failsafe */
