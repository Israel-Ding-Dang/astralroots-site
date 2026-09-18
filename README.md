# astralroots.app, the static site

Five pages Google Play and the app link to, plain HTML with inline CSS in
the Plum Royale colours: `index.html` (the placeholder), `privacy.html`,
`terms.html`, `support.html`, `delete-account.html`. The app links to
`https://astralroots.app/privacy`, `/terms`, `/support` and
`/delete-account` (GitHub Pages serves `privacy.html` at `/privacy`).
`CNAME` holds the custom domain and `.nojekyll` keeps Pages from
processing the folder. Belmont read and approved the privacy and terms pages on 18 Sep 2026,
so the DRAFT markers are gone. His answers are in: effective date 1 October 2026, minimum age 18, governing law
Kenya, the database region (Amazon Web Services, Ireland, read from the
Supabase project), and the astrology API now receives only birth data.
The provider is named on both pages and on delete-account.html as
"Israel Oluye Dianga, trading as D&D TechBros, the developer of
AstralRoots" (Belmont, 18 Sep 2026), with support@astralroots.app as the
contact. No brackets remain. The production Supabase project must be
created in the same region, or the region line changes.

## Publish on GitHub Pages (Belmont, in the browser)

1. Create a new **public** GitHub repository, for example `astralroots-site`.
2. Copy the contents of this folder (the five HTML files, `icon-512.png`,
   `CNAME`, `.nojekyll`) into the repository root and commit to `main`.
3. Repository Settings, Pages: Source "Deploy from a branch", branch
   `main`, folder `/ (root)`. Save.
4. Still under Pages, Custom domain: enter `astralroots.app` and save.
   GitHub checks the DNS below; that can take up to an hour.
5. Once the check passes, tick **Enforce HTTPS** (it may need another
   short wait for the certificate).

## DNS at Porkbun (Belmont does this; never the agent)

Porkbun, Domain Management, astralroots.app, DNS records. Remove
Porkbun's default parking A and CNAME records for the bare domain first.

| Type | Host | Answer | TTL |
|---|---|---|---|
| A | (blank, the bare domain) | 185.199.108.153 | 600 |
| A | (blank, the bare domain) | 185.199.109.153 | 600 |
| A | (blank, the bare domain) | 185.199.110.153 | 600 |
| A | (blank, the bare domain) | 185.199.111.153 | 600 |
| CNAME | www | `<github-username>.github.io` | 600 |

Optional, for IPv6: four AAAA records on the bare domain to
2606:50c0:8000::153, 2606:50c0:8001::153, 2606:50c0:8002::153 and
2606:50c0:8003::153.

Leave Resend's records (the TXT and MX for sending email) exactly as they
are; they live on other hosts and do not clash with these.

## Checks after publishing

- `https://astralroots.app/` shows the placeholder.
- `https://astralroots.app/privacy`, `/terms`, `/support`,
  `/delete-account` open with HTTPS and no certificate warning.
- `https://www.astralroots.app/` redirects to the bare domain.

Supabase, Authentication, URL Configuration: set the Site URL to
`https://astralroots.app` (the emails carry codes, not links, so nothing
else there needs a redirect URL).
