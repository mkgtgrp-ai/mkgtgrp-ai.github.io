# Are You Human? · The Humanity Test

A five-level browser game inspired by reCAPTCHA’s minimal gray, white, and blue style. Built with plain HTML, CSS, and JavaScript. Fully in English, with no dependencies or build step. Works on desktop and mobile.

## Files

```text
index.html
style.css
main.js
README.md
assets/
  mark.svg          # Game icon
  recaptcha.svg     # Local CAPTCHA-style illustration
  professor.png     # User-supplied Professor portrait
```

## Run locally

Extract the package and open `index.html` in a browser. Alternatively, run a static server in this directory, for example `python3 -m http.server 8080`, then open `http://localhost:8080`.

No npm installation, API key, database, or server logic is required. All asset URLs are relative, including support for GitHub Pages project subdirectories. Keep the complete `assets/` folder with the other files.

## Deploy to GitHub Pages

1. Create a GitHub repository.
2. Upload `index.html`, `style.css`, `main.js`, `README.md`, and the complete `assets/` directory to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Choose the `main` branch and `/(root)`, then click **Save**.
6. Wait for deployment and open the address shown in Pages settings, usually `https://your-username.github.io/repository-name/`.

For a `/docs` deployment, move all files together into `docs/` and choose that folder instead. No build command or custom workflow is needed. This package does not create a repository or publish on your behalf.

## Levels

1. **Checkbox:** click the box, watch a 0.5-second spinner, then a green check for 1 second before advancing.
2. **Word search:** a random **12×12** grid contains `SEARCH`, `ENGINE`, and `OPTIMIZATION`. Select them in that order by clicking neighboring letters horizontally, vertically, or diagonally. Generated words have complete straight-line solutions. Click the most recently selected cell to undo, or use **Clear word**; completed words stay highlighted. A letter may be shared by different words, while each word must use distinct cells. **Verify** becomes available after all three words are found. Refresh generates a new grid.
3. **Memory match:** **12 cards / 6 pairs**, in three rows and four columns: strawberry, blueberry, lemon, cherry, watermelon, and Professor. Each entry or refresh applies a fresh Fisher–Yates shuffle. The Professor photo fills the entire front of its card, with a small caption overlay. Mismatches turn back after 1 second. Matching all six pairs advances after 1 second.
4. **Reaction test:** start the timer, then stop it at 1.000 seconds using **Space** or the on-screen button. The hidden rule rejects results within 990–1010 milliseconds inclusive and allows a retry; results outside that window pass. After passing, the timer stays on screen and a message explains the human-imperfection twist. There is no automatic advance: the player must click **Continue to Level 5** after reading. This rule is not revealed in the level’s initial instructions. Uses `performance.now()`. Opening the About dialog or hiding the page resets an active timer.
5. **Number bomb:** guess an integer from 1 to 100. A fresh target is drawn from all 100 possible integers on every entry or refresh, without rounding to multiples of ten. Every miss excludes the guessed number and strictly narrows the remaining interval. **Finding the bomb wins.** Empty, fractional, and out-of-range entries do not count.

Level headings show only Level 1 through Level 5. The progress bar shows 1/5 through 5/5. **Start over** returns to level 1. The refresh icon restarts only the current level, canceling any previous pending transitions.

## Reward and redirect

After all five levels, the game shows **“Congratulations, you’re in!”**, **“Welcome to HKU FBE”**, and **“Human verified”**, with full-screen CSS confetti.

After **3 seconds**, `window.location.href` navigates to:

<https://ug.hkubs.hku.hk/>

The **Explore HKU Business School** link also opens the destination immediately. This is a game achievement, not an actual university admission outcome.

To customize the destination, edit `REWARD_URL` at the top of `main.js` and the fallback `href` of `reward-link` in `index.html`.

## Assets and accessibility

- Uses Arial/system sans-serif fonts, `#f9f9f9`, and `#4285f4`. All assets load locally.
- The Professor portrait was supplied by the user. Replace `assets/professor.png` to change it. The card uses a real `<img>` element with full-card cover sizing.
- Fruit emoji appearance varies by device.
- Includes keyboard focus, English accessibility labels and status announcements, reduced-motion support, and a touchscreen timer control.
- This is an entertainment game, with no official affiliation to Google or HKU. It does not provide real identity or bot verification. No tracking scripts or personal-data uploads are used. Progress stays only in the current page’s memory.
