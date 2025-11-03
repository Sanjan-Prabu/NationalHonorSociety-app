# NHS App Support Website

This is the support website for the NHS App, hosted on GitHub Pages.

## Files

- `index.html` - Main support page with FAQs and contact info
- `privacy.html` - Privacy policy page (paste your generated policy here)
- `terms.html` - Terms of service page
- `styles.css` - Minimal styling for all pages

## Setup Instructions

### 1. Push to GitHub

1. Create a new repository on GitHub (e.g., `nhs-app-support`)
2. Push these files to the repository:

```bash
cd /Users/sanjanprabu/Documents/NationalHonorSociety
git add docs/
git commit -m "Add support website"
git push origin main
```

### 2. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under "Source", select **main** branch and **/docs** folder
4. Click **Save**
5. Your site will be live at: `https://[your-username].github.io/[repo-name]/`

### 3. Add Privacy Policy

Once you generate your privacy policy:
1. Open `docs/privacy.html`
2. Replace the placeholder content with your full privacy policy
3. Commit and push the changes

## Support URL

Use this URL in App Store Connect:
```
https://[your-username].github.io/[repo-name]/
```

## Contact Email

Support email: nhsapp.support@gmail.com
