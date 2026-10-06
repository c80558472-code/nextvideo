document.addEventListener("DOMContentLoaded", () => {
  const q = new URLSearchParams(location.search).get("url");
  const v = document.getElementById("videoUrl");

  if (v && q) {
    v.value = q;
    v.focus();
  }

  const h = document.getElementById("homeForm");

  if (h) {
    h.addEventListener("submit", (e) => {
      e.preventDefault();

      const u = document.getElementById("homeUrl").value.trim();

      if (!u) {
        document.getElementById("homeUrl").focus();
        return;
      }

      location.href =
        "tool.html?tool=Video%20Downloader&url=" +
        encodeURIComponent(u);
    });
  }

  const f = document.getElementById("downloadForm");

  if (f) {
    f.addEventListener("submit", async (e) => {
      e.preventDefault();

      const s = document.getElementById("status");
      const button = f.querySelector("button");
      const url = v.value.trim();

      if (!url) {
        s.textContent = "Please enter a video URL.";
        return;
      }

      try {
        new URL(url);
      } catch {
        s.textContent = "Please enter a valid URL.";
        return;
      }

      button.disabled = true;
      button.textContent = "Processing...";
      s.textContent = "Preparing your download...";

      try {
        const response = await fetch(
          "https://violet-rook-563536.hostingersite.com/api/download",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              url: url
            })
          }
        );

        if (!response.ok) {
          let message = "The media could not be processed.";

          try {
            const data = await response.json();

            if (data.error) {
              message = data.error;
            }
          } catch {}

          throw new Error(message);
        }

        const blob = await response.blob();

        if (!blob.size) {
          throw new Error("No video data was received.");
        }

        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = downloadUrl;
        a.download = "nextvideo-download.mp4";

        document.body.appendChild(a);
        a.click();
        a.remove();

        URL.revokeObjectURL(downloadUrl);

        s.textContent = "Download started successfully.";
      } catch (error) {
        s.textContent =
          error.message ||
          "Download failed. Please try again.";
      } finally {
        button.disabled = false;
        button.textContent = "⇩ Download Video";
      }
    });
  }
});
