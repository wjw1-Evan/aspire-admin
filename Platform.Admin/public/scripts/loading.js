// 简单的加载脚本，用于解决首次加载时的白屏问题
(function() {
  // 如果已经有加载指示器，则不重复创建
  if (document.getElementById('umi-loading')) {
    return;
  }

  // 创建加载指示器
  var loadingDiv = document.createElement('div');
  loadingDiv.id = 'umi-loading';
  loadingDiv.style.cssText = [
    'position: fixed',
    'top: 0',
    'left: 0',
    'width: 100%',
    'height: 100%',
    'background: #fff',
    'z-index: 9999',
    'display: flex',
    'align-items: center',
    'justify-content: center'
  ].join(';');

  var spinner = document.createElement('div');
  spinner.style.cssText = [
    'width: 40px',
    'height: 40px',
    'border: 4px solid #f3f3f3',
    'border-top: 4px solid #1890ff',
    'border-radius: 50%',
    'animation: spin 1s linear infinite'
  ].join(';');

  // 添加旋转动画
  var style = document.createElement('style');
  style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
  document.head.appendChild(style);

  loadingDiv.appendChild(spinner);
  document.body.appendChild(loadingDiv);

  // 当页面加载完成后移除加载指示器
  if (document.readyState === 'complete') {
    removeLoading();
  } else {
    window.addEventListener('load', removeLoading);
  }

  function removeLoading() {
    var loading = document.getElementById('umi-loading');
    if (loading) {
      loading.style.opacity = '0';
      loading.style.transition = 'opacity 0.3s';
      setTimeout(function() {
        if (loading.parentNode) {
          loading.parentNode.removeChild(loading);
        }
      }, 300);
    }
  }
})();
