import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const articleId = req.nextUrl.searchParams.get('article')
  const baseUrl = process.env.NEXTAUTH_URL || 'https://diurna.vercel.app'

  const script = `(function() {
  var articleId = "${articleId || ''}";
  if (!articleId) {
    var scriptTag = document.currentScript || (function() {
      var scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();
    var src = scriptTag.getAttribute('src') || '';
    var match = src.match(/[?&]article=([^&]+)/);
    if (match) articleId = match[1];
  }
  if (!articleId) { console.warn('Diurna embed: no article ID'); return; }

  var container = document.createElement('div');
  container.className = 'diurna-embed';
  container.style.cssText = 'max-width:600px;margin:20px auto;';

  var iframe = document.createElement('iframe');
  iframe.src = '${baseUrl}/api/embed/' + encodeURIComponent(articleId);
  iframe.style.cssText = 'width:100%;border:none;border-radius:12px;overflow:hidden;';
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('title', 'Diurna Article Embed');

  iframe.onload = function() {
    try {
      var h = iframe.contentDocument.documentElement.scrollHeight;
      iframe.style.height = h + 'px';
    } catch(e) {
      iframe.style.height = '500px';
    }
  };

  container.appendChild(iframe);

  var scriptTag = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();
  scriptTag.parentNode.insertBefore(container, scriptTag.nextSibling);
})();`

  return new NextResponse(script, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
