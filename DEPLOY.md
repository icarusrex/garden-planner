# Deployment checklist

## GitHub upload

Upload these files to the repository root:

- `index.html`
- `README.md`
- `DEPLOY.md`
- `.nojekyll`

Do not upload the outer ZIP into the repository unless you also upload the extracted files.

## GitHub Pages

1. GitHub repository → **Settings** → **Pages**.
2. Source: **Deploy from a branch**.
3. Branch: **main**; folder: **/ (root)**.
4. Save and wait for the Pages URL to appear.
5. Open the URL and test **Upload image** mode first.
6. For satellite mode, create a Mapbox public token and paste it into the app.

## Your domain

In GitHub Pages, enter the hostname you want under **Custom domain** (for example `garden.example.com`). GitHub will show the DNS records you need. Add those records at your domain registrar/DNS provider, then turn on **Enforce HTTPS** when GitHub enables it.

A subdomain is usually the cleanest option because it leaves your main website untouched.

## Mapbox token security

Use a public `pk...` browser token, not a secret token. In Mapbox, restrict the token to your deployed domain after the site is live.
