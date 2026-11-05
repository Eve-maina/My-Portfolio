# Eve Maina | Cloud Engineer Portfolio

A one-page, deep space themed portfolio built with plain HTML, CSS and vanilla JavaScript. There is no framework and no build step, so the repository deploys to AWS Amplify Hosting as it is.

## Overview

The page has four sections, linked from a sticky nav bar that highlights the section in view:

- **whoami**: name, role, intro, a short about paragraph and personal interests.
- **skills**: a mission control status board over a real photo of Earth from orbit. All ten skills (AWS, Python, Terraform, Docker, Git, GitHub, Networking, Linux, Agentic AI and Technical writing) are visible at once as systems with a glowing status light, ending in ALL SYSTEMS: GO. When the board scrolls into view the lights run a quick systems check and come online one by one; with reduced motion they are simply on.
- **projects**: flip cards with category filters (All, Cloud, Security, AI, Community). The GitHub button is on the front of every card.
- **my socials**: LinkedIn, GitHub and Medium.

A small **Terminal** button sits in the bottom right corner on every screen. It opens a mini command line that answers `help`, `whoami`, `skills` and `projects` (plus `clear` and `exit`). It looks and behaves like a real shell: visitors type straight onto the prompt line with a blinking block cursor, and get arrow key history, Tab autocomplete, Ctrl+L to clear and Escape to close.

Design: real NASA and James Webb Space Telescope photography, no illustrations. The Cosmic Cliffs of the Carina Nebula sit behind the intro, Earth seen from the International Space Station runs behind the skills, and Earth at night closes the page. Neon cyan and violet accents on deep navy, with glass cards that keep text readable. Fonts are Space Grotesk (body) and Orbitron (headings) from Google Fonts.

## The creative feature: Mission: Secure the Station

The portfolio is a normal scrolling page. The mission is an optional extra, found through the glowing **Launch Mission** button with a rocket icon in the nav.

Clicking it plays a real NASA Space Shuttle liftoff recording and gives the page a short rumble, then a round viewport opens onto the mission as a full-screen layer on top of the page. The portfolio underneath is never changed or locked. **Back to portfolio** is always visible, and Escape also closes it.

> You are the station's security officer. 5 breaches need sealing.

Visitors scan a real photo of the International Space Station, styled like a live camera feed, with a scanner lens (or use **List view**, the default on phones). Each breach is a station emergency that maps to a classic AWS mistake, and each is fixed with its own hands-on mini-game:

| Station emergency | Breach | What the visitor does |
|---|---|---|
| Airlock venting into space | Public S3 bucket | Flips the four Block Public Access switches and watches an unknown probe's request go from 200 OK to 403 |
| Access card drifting out the hatch | Hardcoded secret | Finds the password in the code, drags it into a Secrets Manager vault, then rotates it |
| Master control key marked `*` | Over-permissive IAM policy | Builds a least-privilege policy and watches live requests flip between ALLOWED and DENIED |
| Docking bay left unlocked | No MFA | Enforces MFA, then types the docking code from a virtual token before its 30 second timer runs out |
| Comms satellite gone dark | Logging disabled | Switches on CloudTrail, spots the 3 AM root sign-in in the telemetry stream, then creates an alarm |

Wrong moves explain why, so the game teaches as it goes. Each breach appears as a real NASA photo in a ring that turns from red to green once it is sealed.

A counter shows breaches sealed, and the progress bar moves through **Launch Pad**, **Orbit** (3 sealed) and **Deep Space** (all 5, unlocks a handbook of ten best cloud security practices and a button to connect on LinkedIn). Progress is saved in localStorage, and every storage call is wrapped in try/catch so the site still works when storage is blocked.

## Accessibility

- Semantic landmarks, a skip link, visible focus styles and labelled controls.
- Everything works with a keyboard. The mobile menu, flip cards, filters and mission all respond to Enter and Space.
- The mission is a modal dialog: focus moves into it, the page behind is inert, and focus returns to the Launch button on close.
- Motion follows the system `prefers-reduced-motion` setting, and the visible **Reduce motion** toggle overrides it. With reduced motion the viewport opening and the rumble are skipped, the hero photo stays still and the skills board skips its systems check, and cards swap without rotating.
- Every mini-game works by tap, mouse or keyboard. Dragging is optional, and the MFA timer can be paused.
- The only sound is one short liftoff recording, and it plays only when a visitor clicks **Launch Mission**, never on page load. A **Sound on / Sound off** button in the mission bar mutes it and remembers the choice.

## Tech stack

- HTML5, CSS3 (custom properties, grid, flexbox), vanilla JavaScript (ES5 compatible style)
- Real NASA and JWST photos (public domain) for the hero, skills band, station scene and breaches
- An SVG icon sprite
- AWS Amplify Hosting for HTTPS, CDN and continuous deployment from GitHub

## File structure

```
index.html
css/style.css
js/main.js        motion setting, nav, project cards and filters
js/terminal.js    the bottom right mini terminal
js/station.js     Mission: Secure the Station and its five mini-games
assets/           icons.svg, favicon.svg, apple-touch-icon.png
assets/photos/    NASA and JWST photos
assets/audio/     the liftoff sound (MP3 and OGG)
customHttp.yml    optional security headers for Amplify
README.md
```

## Run locally

From the project folder:

```bash
python3 -m http.server
```

Then open http://localhost:8000. A local server is needed (rather than opening the file directly) so the SVG icon sprite loads.

## Deploy to AWS Amplify Hosting

1. Push this folder to a GitHub repository.
2. In the AWS console, open **AWS Amplify** and choose **Create new app**.
3. Select **GitHub** as the source, authorize access to only this repository, and pick the branch (for example `main`).
4. On the build settings page, Amplify detects that there is no framework. Leave the build command empty and set the output directory to the repository root (`/`). If it asks for a build spec, use:

   ```yaml
   version: 1
   frontend:
     phases:
       build:
         commands: []
     artifacts:
       baseDirectory: /
       files:
         - '**/*'
   ```

5. Choose **Save and deploy**. Amplify gives you an HTTPS URL on `amplifyapp.com`.
6. Optional: add a custom domain under **Hosting, Custom domains**. Amplify issues and renews the certificate.
7. Optional: security headers. Amplify reads `customHttp.yml` from the repo root. You can also paste the same headers into **Hosting, Custom headers** in the console.

Every push to the connected branch triggers a new deployment.

## Before you publish

Search the project for `TODO` to find every placeholder, including:

- the one-line intro and about paragraph
- the project descriptions
- the Broken Labs repository link

## Photo and sound credits

All images and audio are public domain works of NASA (and, for the Webb image, NASA, ESA, CSA and STScI), sourced through Wikimedia Commons. Credit is given here with thanks.

- Hero, the Cosmic Cliffs in the Carina Nebula: [NASA, ESA, CSA, STScI](https://commons.wikimedia.org/wiki/File:NASA%E2%80%99s_Webb_Reveals_Cosmic_Cliffs,_Glittering_Landscape_of_Star_Birth.jpg)
- Station scene, the ISS after STS-132 undocking: [NASA](https://commons.wikimedia.org/wiki/File:International_Space_Station_after_undocking_of_STS-132.jpg)
- Skills band, Earth from the ISS: [NASA](https://commons.wikimedia.org/wiki/File:ISS045-E-41171_-_View_of_Earth.jpg)
- Footer, the Persian Gulf at night from the ISS: [NASA](https://commons.wikimedia.org/wiki/File:ISS-63_Persian_Gulf_at_night.jpg)
- Airlock: [NASA](https://commons.wikimedia.org/wiki/File:ISS-36_EVA-2_e_Luca_Parmitano_leaves_the_Quest_airlock.jpg)
- Access card (spacewalk): [NASA](https://commons.wikimedia.org/wiki/File:STS-116_spacewalk_1.jpg)
- Master key (Destiny laboratory): [NASA](https://commons.wikimedia.org/wiki/File:ISS-47_The_International_Space_Station%27s_Destiny_Laboratory_at_%27night%27.jpg)
- Docking bay (Crew Dragon): [NASA](https://commons.wikimedia.org/wiki/File:Crew_Dragon_Demo2_approaching_ISS.png)
- Comms satellite (Hubble): [NASA](https://commons.wikimedia.org/wiki/File:View_of_Hubble_after_Being_Released_from_the_Shuttle_Atlantis_(28223588012).jpg)
- Liftoff sound, Space Shuttle Discovery STS-41D: [NASA](https://commons.wikimedia.org/wiki/File:Discovery_-_STS-41D_Liftoff.mp3), trimmed and normalised for the site
