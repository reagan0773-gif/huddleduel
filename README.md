# Huddle Duel: app project

This folder turns Huddle Duel into real iPhone and Android apps. You don't need a Mac.
A cloud service called **Codemagic** builds the apps on its Macs, using 500 free build
minutes each month. One build takes roughly 5–15 minutes.

## What's in here

| Item | What it is |
|---|---|
| `www/index.html` | The game itself, set up to work fully offline |
| `capacitor.config.json` | App name, app ID, colors, and launch screen settings |
| `assets/generated/` | The app icon and launch screen in every size both stores need |
| `scripts/` | Small helpers that build the iPhone and Android projects in the cloud |
| `codemagic.yaml` | The cloud build recipes (four workflows, described below) |

The app ID is **com.huddleduel.game**. You can change it in `capacitor.config.json`
and `codemagic.yaml`, but only before your first store upload. After that it is permanent.

---

## Step 1: Put the project on GitHub (free)

1. Create an account at **github.com** if you don't have one.
2. Click **New repository**, name it `huddle-duel`, choose **Private**, and click **Create repository**.
3. On the new repository page, click **uploading an existing file**.
4. Unzip `huddle-duel-app.zip` on your computer. Open the `huddle-duel-app` folder and drag
   **everything inside it** into the upload area. Include the `www`, `assets`, and `scripts` folders
   and the `.gitignore` file. On a Mac, press Cmd+Shift+. to show hidden files like `.gitignore`.
5. Click **Commit changes**.

## Step 2: Connect Codemagic (free)

1. Go to **codemagic.io** and sign up with your GitHub account.
2. Click **Add application**, choose GitHub, and pick the `huddle-duel` repository.
3. When asked about the project type, choose **Other** or **codemagic.yaml**.
   Codemagic reads the build recipes from `codemagic.yaml` automatically.

## Step 3: Run the two free checks

Start these before paying for any developer account. They prove the app compiles.

- **iOS build check**: builds the iPhone app for Apple's simulator. A green result means the iPhone app is ready.
- **Android test build**: builds an Android app file (`.apk`) you can download and install on any Android phone.

In Codemagic, click **Start new build**, pick the workflow, and click **Start**.
If one fails, copy the error text from the log and send it to Claude.

---

## Step 4: iPhone and the App Store

**You'll need:** an Apple Developer Program membership ($99 a year).

1. **Enroll** at developer.apple.com/programs. Approval can take a day or two.
2. **Create the app record.** In **App Store Connect** (appstoreconnect.apple.com), go to
   **Apps → + → New App**. Choose iOS, enter the name **Huddle Duel**, and for the bundle ID
   register **com.huddleduel.game**. For the SKU, type anything, such as `huddleduel001`.
3. **Create an API key for Codemagic.** In App Store Connect, go to **Users and Access →
   Integrations → App Store Connect API**, click **+**, choose the **App Manager** role, and
   download the `.p8` key file. Note the **Issuer ID** and **Key ID** shown on that page.
4. **Add the key to Codemagic.** In Codemagic, open **Settings** (or **Team settings**) **→ Integrations → Developer Portal → Manage keys**,
   name it exactly **Huddle Duel API key**, and enter the Issuer ID, Key ID, and `.p8` file.
5. **Build.** Run the **iOS release to TestFlight** workflow. Codemagic creates the signing
   certificates for you, builds the app, and uploads it to TestFlight.
6. **Play it on your iPhone.** Install Apple's free **TestFlight** app, then accept the
   invitation from App Store Connect. You can invite friends to test, too.
7. **Submit for review.** In App Store Connect, add screenshots, a description, a price, an age
   rating, and a privacy policy link, then submit. The game collects no data, so the privacy
   answers are simple.

## Step 5: Android and Google Play

**You'll need:** a Google Play developer account ($25, one time).

1. **Sign up** at play.google.com/console.
2. **Create a signing key in Codemagic.** In Codemagic, open **Settings** (or **Team settings**) **→ Code signing identities →
   Android keystores**, then generate or upload a keystore. Name the reference exactly **huddle_duel_keystore**.
   **Download a backup and keep it somewhere safe.** You need this key for every future update.
3. **Build.** Run the **Android release** workflow and download the `.aab` file it produces.
4. **Create the app in Play Console** and upload the `.aab` to a **Closed testing** track.
   New personal accounts must run a closed test with at least 12 testers for 14 days before
   the app can go public.
5. Once that's done, promote the build to **Production**.

## Updating the game later

Change the files, upload them to GitHub, and in `package.json` raise `"version"` (for example
`1.0.0` → `1.1.0`). Then run the release workflows again. Codemagic increases the build number
automatically.

## Regenerating the icon

If you change the icon design in `scripts/make-icons.py`, run `npm run icons` (needs Python with
Pillow) or ask Claude to do it.
