"""Fetch every photo in a post. stdout is reserved for the JSON response."""
import sys, json, os, base64, io
from contextlib import redirect_stdout

def main():
    import instaloader
    from PIL import Image, ImageOps
    from urllib.parse import urlparse
    loader = instaloader.Instaloader(quiet=True, max_connection_attempts=1, request_timeout=20)
    if os.environ.get('INSTAGRAM_USERNAME') and os.environ.get('INSTAGRAM_SESSION_FILE'):
        loader.load_session_from_file(os.environ['INSTAGRAM_USERNAME'], os.environ['INSTAGRAM_SESSION_FILE'])
    post = instaloader.Post.from_shortcode(loader.context, sys.argv[1])
    nodes = list(post.get_sidecar_nodes()) if post.typename == 'GraphSidecar' else [post]
    images, skipped = [], 0
    for index, node in enumerate(nodes):
        if node.is_video:
            skipped += 1
            continue
        url = node.display_url if post.typename == 'GraphSidecar' else post.url
        parsed = urlparse(url)
        host = parsed.hostname or ''
        if parsed.scheme != 'https' or not (host.endswith('.cdninstagram.com') or host.endswith('.fbcdn.net')):
            raise ValueError('Instagram returned an unsupported image host. Upload the photos instead.')
        response = loader.context.get_raw(url)
        # Limit each download before decoding.
        buffer = io.BytesIO()
        for chunk in response.iter_content(65536):
            buffer.write(chunk)
            if buffer.tell() > 20 * 1024 * 1024:
                raise ValueError('A post photo is too large. Upload a smaller version instead.')
        buffer.seek(0)
        with Image.open(buffer) as original:
            img = ImageOps.exif_transpose(original).convert('RGB')
            img.thumbnail((1280, 1280))
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=88)
        images.append({'name': f'Photo {index + 1}', 'image': 'data:image/jpeg;base64,' + base64.b64encode(output.getvalue()).decode()})
    return {'images': images, 'caption': (post.caption or '')[:3000], 'skippedVideos': skipped, 'photoCount': len(images)}

try:
    with redirect_stdout(sys.stderr):
        result = main()
    print(json.dumps(result))
except ImportError:
    print(json.dumps({'error': 'Instagram import needs the Python dependencies. Install server/requirements.txt or use the Docker image. You can upload all post photos below instead.'}))
except Exception:
    print(json.dumps({'error': 'Instagram could not provide all post photos. It may require a session, be private, or be rate-limited. Upload all photos below, or configure an Instagram session on the server.'}))
