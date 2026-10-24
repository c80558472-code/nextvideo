'use strict';

(() => {
  // Use the local backend for localhost testing; use the existing Hostinger backend on the live site.
  const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:3000'
    : 'https://violet-rook-563536.hostingersite.com';

  document.addEventListener('DOMContentLoaded', () => {
    const isHome = document.getElementById('homeForm') !== null;
    const form = document.getElementById(isHome ? 'homeForm' : 'downloadForm');
    const input = document.getElementById(isHome ? 'homeUrl' : 'videoUrl');
      if (!form || !input) return;

    const status = document.getElementById('status');
    const submitButton = document.getElementById('inspectButton');
    const result = document.getElementById('videoResult');
    const heroGrid = document.querySelector('.hero-grid');
    const heroContent = document.querySelector('.hero-content');
    const resultHomePlaceholder = result ? document.createComment('NEXTVIDEO result original position') : null;
    if (result && result.parentNode) result.parentNode.insertBefore(resultHomePlaceholder, result);

    const syncMobileResultPlacement = () => {
      if (!result || !resultHomePlaceholder || !heroGrid || !heroContent) return;
      const mobile = window.matchMedia('(max-width: 650px)').matches;
      if (mobile) {
        if (result.parentNode !== heroGrid) {
          heroContent.insertAdjacentElement('afterend', result);
        }
        result.classList.add('nv-mobile-in-hero');
      } else {
        if (result.parentNode !== resultHomePlaceholder.parentNode && resultHomePlaceholder.parentNode) {
          resultHomePlaceholder.parentNode.insertBefore(result, resultHomePlaceholder.nextSibling);
        }
        result.classList.remove('nv-mobile-in-hero');
      }
    };
    window.addEventListener('resize', syncMobileResultPlacement, { passive: true });
    const thumbnail = document.getElementById('videoThumbnail');
    const thumbnailFallback = document.getElementById('thumbnailFallback');
    const title = document.getElementById('videoTitle');
    const duration = document.getElementById('videoDuration');
    const videoFormats = document.getElementById('videoFormats');
    const audioFormats = document.getElementById('audioFormats');
    const audioSection = document.getElementById('audioSection');

    // Add a small clear (×) control inside the shared URL field on the homepage
    // and every downloader page without changing each page's HTML layout.
    const urlClearStyle = document.createElement('style');
    urlClearStyle.id = 'nv-url-clear-styles';
    urlClearStyle.textContent = `
      .nv-url-input-wrap {
        position: relative;
        display: flex;
        align-items: stretch;
        flex: 1 1 0%;
        min-width: 0;
      }
      .nv-url-input-wrap > input {
        width: 100%;
        min-width: 0;
        padding-right: 48px !important;
      }
      .nv-url-input-wrap .nv-url-clear {
        position: absolute !important;
        z-index: 2;
        top: 50%;
        right: 10px;
        transform: translateY(-50%);
        display: inline-grid !important;
        visibility: visible !important;
        opacity: 1 !important;
        place-items: center;
        width: 28px;
        min-width: 28px;
        height: 28px;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 50% !important;
        background: #edf1f7 !important;
        color: #68758a !important;
        box-shadow: none !important;
        font: 22px/1 Arial, sans-serif !important;
        cursor: pointer;
      }
      .nv-url-input-wrap .nv-url-clear:hover {
        background: #dfe6f1 !important;
        color: #24324b !important;
      }
      .nv-url-input-wrap .nv-url-clear:focus-visible {
        outline: 2px solid #6551e8;
        outline-offset: 2px;
      }
      @media (max-width: 650px) {
        .nv-url-input-wrap { width: 100%; flex: 0 0 auto; }
      }
    `;
    document.head.appendChild(urlClearStyle);

    const urlInputWrap = document.createElement('div');
    urlInputWrap.className = 'nv-url-input-wrap';
    input.parentNode.insertBefore(urlInputWrap, input);
    urlInputWrap.appendChild(input);

    const clearUrlButton = document.createElement('button');
    clearUrlButton.type = 'button';
    clearUrlButton.className = 'nv-url-clear';
    clearUrlButton.textContent = '×';
    clearUrlButton.setAttribute('aria-label', 'Clear URL');
    clearUrlButton.title = 'Clear URL';
    urlInputWrap.appendChild(clearUrlButton);

    // Keep the clear control visible so it is always discoverable. It can be
    // clicked whenever the field contains a URL, without relying on input events
    // or browser autofill state to reveal it.
    clearUrlButton.addEventListener('click', () => {
      input.value = '';
      input.focus();
      input.dispatchEvent(new Event('input', { bubbles: true }));
      if (result) result.hidden = true;
      if (status) {
        status.textContent = '';
        status.className = 'nv-status';
      }
    });

    const setStatus = (message, type = 'info') => {
      status.textContent = message;
      status.className = `nv-status nv-status-${type}`;
    };

    const formatDuration = (value) => {
      const seconds = Number(value);
      if (!Number.isFinite(seconds) || seconds < 0) return '';
      const total = Math.floor(seconds);
      const hours = Math.floor(total / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const remaining = total % 60;
      return hours > 0
        ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
        : `${minutes}:${String(remaining).padStart(2, '0')}`;
    };

    const formatFileSize = (bytes) => {
      const value = Number(bytes);
      if (!Number.isFinite(value) || value <= 0) return '';
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let size = value;
      let index = 0;
      while (size >= 1024 && index < units.length - 1) {
        size /= 1024;
        index += 1;
      }
      return `${size >= 100 || index === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[index]}`;
    };

    // Reduce long social-media captions to a practical title for display and filenames.
    // If a source puts engagement counts and description sections around the title,
    // prefer the first actual title segment rather than saving the whole caption.
    const makeShortTitle = (rawTitle) => {
      let value = String(rawTitle || '')
        .normalize('NFKC')
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!value) return '';

      const sections = value.split(/\s*\|\s*/).map((part) => part.trim()).filter(Boolean);
      if (sections.length > 1) {
        // Drop a leading section such as "18K views · 2.2K reactions".
        if (/(?:^|\b)\d[\d.,]*\s*[KMB]?\s*(?:views?|reactions?|likes?|comments?|shares?)\b/i.test(sections[0])) {
          sections.shift();
        }
        value = sections[0] || value;
      }

      value = value.replace(/^\s*\d[\d.,]*\s*[KMB]?\s+(?:views?|reactions?|likes?|comments?|shares?)\b\s*[·•-]?\s*/i, '').trim();
      // Remove leading emoji/decorative symbols so the saved filename looks professional.
      value = value.replace(/^[^\p{L}\p{N}]+/u, '').trim();
      // Avoid carrying a trailing run of hashtags into a filename/title.
      value = value.replace(/(?:\s+#[\p{L}\p{N}_-]+)+\s*$/gu, '').trim();

      // Keep unusually long single-part titles readable and filenames practical.
      const maxCharacters = 72;
      const characters = Array.from(value);
      if (characters.length > maxCharacters) {
        const limited = characters.slice(0, maxCharacters).join('');
        const lastSpace = limited.lastIndexOf(' ');
        value = (lastSpace > 36 ? limited.slice(0, lastSpace) : limited).trim();
      }
      return value.replace(/[|·•,\s-]+$/g, '').trim();
    };

    // Build a filename from the source video's real title, safe on Windows, Android and browsers.
    const makeDownloadFilename = (rawTitle, rawExtension) => {
      let base = String(rawTitle || '')
        .normalize('NFKC')
        .replace(/[\u0000-\u001F\u007F<>:"\/\\|?*]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/[. ]+$/g, '');

      if (!base || /^(video details unavailable|video details)$/i.test(base)) base = 'video';

      const extension = String(rawExtension || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
      if (base.toLowerCase().endsWith(`.${extension}`)) {
        base = base.slice(0, -(extension.length + 1)).replace(/[. ]+$/g, '');
      }
      // Keep names at a practical length and avoid Windows reserved device names.
      base = Array.from(base).slice(0, 180).join('').replace(/[. ]+$/g, '') || 'video';
      if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(base)) base = `_${base}`;
      return `${base}.${extension}`;
    };

    const parseResponse = async (response) => {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (!response.ok || data?.ok === false) {
          throw new Error(data?.error || 'The request could not be completed. Please try another supported URL.');
        }
        return data;
      }
      if (!response.ok) throw new Error(`The server returned HTTP ${response.status}. Please try again later.`);
      return response.blob();
    };

    const validateUrl = (rawValue) => {
      let parsed;
      try {
        parsed = new URL(rawValue);
      } catch {
        throw new Error('Please enter a valid video URL.');
      }
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
        throw new Error('Please enter a public HTTP or HTTPS video URL.');
      }
      const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
      if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be' || host.endsWith('.youtu.be') || host === 'youtube-nocookie.com' || host.endsWith('.youtube-nocookie.com')) {
        throw new Error('YouTube is not included in the current downloader options. Please use another supported URL.');
      }
      return parsed.href;
    };

    const makeEmptyMessage = (message) => {
      const p = document.createElement('p');
      p.className = 'nv-empty';
      p.textContent = message;
      return p;
    };

    const makeFallbackFormat = () => ({
      formatId: 'best-available-mp4',
      ext: 'mp4',
      kind: 'video',
      height: null,
      needsMerge: true,
      fallback: true,
      label: 'MP4 · Best available quality (automatic)',
      filesize: null
    });

    const downloadFormat = async (videoUrl, format, kind, videoTitle, button) => {
      const originalLabel = button.textContent;
      button.disabled = true;
      button.textContent = 'Preparing…';
      setStatus(`Preparing ${format.label || 'your selected file'}…`);
      try {
        const response = await fetch(`${API_BASE}/api/download`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: videoUrl,
            formatId: format.formatId,
            formatExt: format.ext,
            formatKind: kind,
            formatHeight: kind === 'video' ? format.height : undefined,
            formatBitrate: kind === 'audio' ? format.bitrate : undefined,
            fallback: format.fallback === true
          })
        });

        const contentType = response.headers.get('content-type') || '';
        if (!response.ok || contentType.includes('application/json')) {
          let errorMessage = `Download failed (HTTP ${response.status}).`;
          try {
            const data = await response.json();
            if (data?.error) errorMessage = data.error;
          } catch { /* Keep the fallback message. */ }
          throw new Error(errorMessage);
        }

        const blob = await response.blob();
        if (!blob.size) throw new Error('The server returned an empty file. Please try another option.');

        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const extension = String(format.ext || 'mp4').replace(/[^a-z0-9]/gi, '') || 'mp4';
        link.href = objectUrl;
        link.download = makeDownloadFilename(videoTitle, extension);
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        const usedFallback = response.headers.get('X-NEXTVIDEO-Fallback') === 'best-available-mp4';
        setStatus(
          usedFallback
            ? 'The exact quality was unavailable, so the best available MP4 was downloaded instead.'
            : 'Download started. If your browser asks, choose where to save the file.',
          'success'
        );
      } catch (error) {
        setStatus(error?.message || 'Download failed. Please try again.', 'error');
      } finally {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    };

    const renderFormats = (container, formats, kind, videoUrl, videoTitle) => {
      container.replaceChildren();
      if (!Array.isArray(formats) || formats.length === 0) {
        container.appendChild(makeEmptyMessage(
          kind === 'video'
            ? 'No directly downloadable single-file video formats were reported for this URL.'
            : 'No supported audio-only formats were reported for this URL.'
        ));
        return 0;
      }

      formats.forEach((format) => {
        const row = document.createElement('div');
        row.className = 'nv-format-row';

        const badge = document.createElement('span');
        badge.className = `nv-file-badge ${kind === 'audio' ? 'nv-file-audio' : ''}`;
        badge.textContent = String(format.ext || (kind === 'audio' ? 'audio' : 'video')).toUpperCase();

        const details = document.createElement('div');
        details.className = 'nv-format-details';
        const label = document.createElement('strong');
        label.textContent = format.label || `${kind === 'audio' ? 'Audio' : 'Video'} file`;
        const size = document.createElement('small');
        size.textContent = formatFileSize(format.filesize) || 'Size not provided';
        details.append(label, size);

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'nv-download-button';
        button.textContent = '↓ Download';
        button.addEventListener('click', () => downloadFormat(videoUrl, format, kind, videoTitle, button));

        row.append(badge, details, button);
        container.appendChild(row);
      });
      return formats.length;
    };

    const showVideo = (video, videoUrl) => {
      const downloadTitle = makeShortTitle(video?.title) || 'video';
      title.textContent = downloadTitle;
      // Keep a long title from expanding the result card beyond two lines.
      title.style.display = '-webkit-box';
      title.style.webkitBoxOrient = 'vertical';
      title.style.webkitLineClamp = '2';
      title.style.overflow = 'hidden';
      const formattedDuration = formatDuration(video?.duration);
      duration.textContent = formattedDuration ? `Duration: ${formattedDuration}` : 'Duration unavailable';

      const thumbnailUrl = typeof video?.thumbnail === 'string' ? video.thumbnail : '';
      let allowedThumbnail = false;
      try {
        const parsed = new URL(thumbnailUrl);
        allowedThumbnail = ['http:', 'https:'].includes(parsed.protocol);
      } catch { /* No usable thumbnail. */ }

      if (allowedThumbnail) {
        thumbnail.src = thumbnailUrl;
        thumbnail.hidden = false;
        thumbnailFallback.hidden = true;
        thumbnail.onerror = () => {
          thumbnail.hidden = true;
          thumbnailFallback.hidden = false;
        };
      } else {
        thumbnail.removeAttribute('src');
        thumbnail.hidden = true;
        thumbnailFallback.hidden = false;
      }

      let options = Array.isArray(video?.videoFormats) ? video.videoFormats : [];
      const fallbackOnly = video?.fallbackOnly === true || options.length === 0;
      if (options.length === 0) options = [makeFallbackFormat()];

      const videoCount = renderFormats(videoFormats, options, 'video', videoUrl, downloadTitle);
      const audioCount = renderFormats(audioFormats, video?.audioFormats, 'audio', videoUrl, downloadTitle);
      audioSection.hidden = audioCount === 0;
      result.hidden = false;
      syncMobileResultPlacement();
      if (fallbackOnly) {
        setStatus(
          'Quality details were not available. You can try the automatic MP4 option; download success still depends on source access and supported formats.',
          'info'
        );
      } else {
        setStatus(
          videoCount || audioCount
            ? `Video details loaded. ${videoCount} video option(s)${audioCount ? ` and ${audioCount} audio option(s)` : ''} available.`
            : 'No downloadable options were reported for this URL.',
          videoCount || audioCount ? 'success' : 'info'
        );
      }
    };

    // When the homepage redirects here with ?url=..., load video details automatically.
    const params = new URLSearchParams(window.location.search);
    const queryUrl = params.get('url');
    if (queryUrl) input.value = queryUrl;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      result.hidden = true;
      const buttonLabel = submitButton.textContent;
      submitButton.disabled = true;
      submitButton.textContent = 'Checking…';

      try {
        const videoUrl = validateUrl(input.value.trim());
        setStatus('Checking video details and available formats…');
        const response = await fetch(`${API_BASE}/api/info`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: videoUrl })
        });
        if (!response.ok) {
          let errorData = {};
          try {
            if ((response.headers.get('content-type') || '').includes('application/json')) {
              errorData = await response.json();
            }
          } catch { /* Use the HTTP status fallback below. */ }

          // If only metadata/format listing failed, still let the user attempt a
          // best-available MP4 download. Private/removed/restricted media can still fail.
          if (response.status === 502 || response.status === 504) {
            showVideo({
              title: 'Video details unavailable',
              thumbnail: null,
              duration: null,
              videoFormats: [makeFallbackFormat()],
              audioFormats: [],
              fallbackOnly: true
            }, videoUrl);
            return;
          }
          throw new Error(errorData.error || `The server returned HTTP ${response.status}. Please try again.`);
        }

        const data = await response.json();
        if (data?.ok === false) throw new Error(data.error || 'The request could not be completed.');
        if (!data?.video) throw new Error('The server did not return video details. Please try again later.');
        showVideo(data.video, videoUrl);
      } catch (error) {
        setStatus(error?.message || 'Could not load video details. Please try another supported URL.', 'error');
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = buttonLabel;
      }
    });

    // The homepage already provided the URL. Match the requested workflow:
    // fetch title, thumbnail, duration, and available options without a second click.
    if (queryUrl && input.value.trim()) {
      form.requestSubmit();
    }
  });
})();
