# Eve Maina | Cloud Engineer Portfolio

My personal portfolio: a one-page, deep space themed site that introduces who I am, the skills I work with and the projects I have built, with an interactive cloud security mission hidden behind a single button.


### The creative feature: Mission: Secure the Station
The glowing **Launch Mission** button in the nav plays a real NASA Space Shuttle liftoff, gives the page a short rumble and opens a round viewport onto the mission.

> You are the station's security officer. 5 breaches need sealing.

Visitors scan a real photo of the International Space Station, styled like a live camera feed. Each breach is a station emergency that maps to a classic AWS mistake, and each one is fixed with its own hands-on mini-game:

| Station emergency | Breach | What the visitor does |
|---|---|---|
| Airlock venting into space | Public S3 bucket | Flips the four Block Public Access switches and watches an unknown probe's request go from 200 OK to 403 |
| Access card drifting out the hatch | Hardcoded secret | Finds the password in the code, drags it into a Secrets Manager vault, then rotates it |
| Master control key marked `*` | Over-permissive IAM policy | Builds a least-privilege policy and watches live requests flip between ALLOWED and DENIED |
| Docking bay left unlocked | No MFA | Enforces MFA, then types the docking code from a virtual token before its 30 second timer runs out |
| Comms satellite gone dark | Logging disabled | Switches on CloudTrail, spots the 3 AM root sign-in in the telemetry stream, then creates an alarm |

Wrong moves explain why, so the game teaches as it goes. Progress moves from **Launch Pad** to **Orbit** to **Deep Space**, where a handbook of ten best cloud security practices and a button to connect on LinkedIn are waiting. The mission never gets in the way: the portfolio stays fully usable, and **Back to portfolio** or Escape closes it at any time.

### Accessible and responsive
- Works on phones, tablets and desktops, with a hamburger menu and a list view of the mission on small screens.
- Fully keyboard operable, with visible focus styles, labelled controls and a skip link.
- A visible **Reduce motion** toggle that also follows the device setting.
- The liftoff sound plays only when **Launch Mission** is clicked, never on page load, and can be muted.

## Tech stack

- HTML5, CSS3 and vanilla JavaScript, with no frameworks
- Google Fonts: Orbitron for headings and Space Grotesk for body text
- Real NASA and James Webb Space Telescope photography
- AWS Amplify Hosting, with HTTPS, a global CDN and continuous deployment from GitHub
- Security headers, including a strict Content-Security-Policy and HSTS

## Credits

All images and audio are public domain works of NASA (and, for the Webb image, NASA, ESA, CSA and STScI), sourced through Wikimedia Commons, with thanks.

- Cosmic Cliffs in the Carina Nebula: [NASA, ESA, CSA, STScI](https://commons.wikimedia.org/wiki/File:NASA%E2%80%99s_Webb_Reveals_Cosmic_Cliffs,_Glittering_Landscape_of_Star_Birth.jpg)
- The International Space Station after STS-132 undocking: [NASA](https://commons.wikimedia.org/wiki/File:International_Space_Station_after_undocking_of_STS-132.jpg)
- Earth from the ISS: [NASA](https://commons.wikimedia.org/wiki/File:ISS045-E-41171_-_View_of_Earth.jpg)
- The Persian Gulf at night from the ISS: [NASA](https://commons.wikimedia.org/wiki/File:ISS-63_Persian_Gulf_at_night.jpg)
- Leaving the Quest airlock: [NASA](https://commons.wikimedia.org/wiki/File:ISS-36_EVA-2_e_Luca_Parmitano_leaves_the_Quest_airlock.jpg)
- STS-116 spacewalk: [NASA](https://commons.wikimedia.org/wiki/File:STS-116_spacewalk_1.jpg)
- The Destiny laboratory at night: [NASA](https://commons.wikimedia.org/wiki/File:ISS-47_The_International_Space_Station%27s_Destiny_Laboratory_at_%27night%27.jpg)
- Crew Dragon approaching the ISS: [NASA](https://commons.wikimedia.org/wiki/File:Crew_Dragon_Demo2_approaching_ISS.png)
- The Hubble Space Telescope: [NASA](https://commons.wikimedia.org/wiki/File:View_of_Hubble_after_Being_Released_from_the_Shuttle_Atlantis_(28223588012).jpg)
- Space Shuttle Discovery STS-41D liftoff sound: [NASA](https://commons.wikimedia.org/wiki/File:Discovery_-_STS-41D_Liftoff.mp3)
