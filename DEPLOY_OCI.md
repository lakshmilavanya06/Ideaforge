# Deploying to Oracle Cloud Infrastructure (OCI) Free Tier

Do this only after the app is fully working locally (see `SETUP_GUIDE.md`) and you understand what it does. Deployment should be the last step, not the first thing you attempt.

This gets you a real, publicly-reachable URL running your app — the strongest possible version of the resume line "deployed on Oracle Cloud Infrastructure," because it'll be true and you can pull it up live in an interview if asked.

## 1. Create a Compute Instance

1. Log into the OCI Console (console.oraclecloud.com) with your certification account.
2. Go to **Compute → Instances → Create Instance**.
3. Choose an **"Always Free eligible"** shape — typically a `VM.Standard.E2.1.Micro` or an Ampere A1 shape (check the "Always Free eligible" label so you don't get billed).
4. Choose **Canonical Ubuntu** as the image (any recent LTS version).
5. Under "Add SSH keys," either generate a new key pair and download the private key, or paste your own public key. You'll need this to log in.
6. Click **Create**. Wait for the instance state to show "Running."

## 2. Open the network port

By default, OCI blocks incoming traffic except SSH. You need to open port 3000 (or 80, see step 5).

1. On your instance's detail page, click the subnet link under "Primary VNIC."
2. Open the **Security List** attached to it.
3. Click **Add Ingress Rules**:
   - Source CIDR: `0.0.0.0/0`
   - IP Protocol: TCP
   - Destination Port Range: `3000` (or `80` if you do step 5)
4. Save.

This is the OCI-specific networking concept worth being able to explain: traffic has to be explicitly allowed through both the OS firewall and OCI's security list — and it's genuinely two separate layers, not one. The Security List controls traffic at the cloud network level, outside the machine entirely. But Oracle's stock Ubuntu images also ship with `iptables` rules active *inside* the instance that block incoming traffic by default. People very commonly open the Security List port, still can't reach their app, and assume something else is broken — it's almost always this second layer.

Once you've connected to the instance (step 3 below), also run:

```bash
sudo iptables -I INPUT -p tcp --dport 3000 -j ACCEPT
sudo netfilter-persistent save
```

(If your image uses `ufw` instead of raw `iptables`, use `sudo ufw allow 3000/tcp` instead — check which one applies with `sudo iptables -L` or `sudo ufw status`.)

Both layers — the OCI Security List *and* the instance's own firewall — have to allow the port before traffic gets through. This trips up almost everyone the first time and is a genuinely good thing to be able to explain if asked how deployment went.

## 3. Connect to the instance

```bash
chmod 400 /path/to/your-private-key.key
ssh -i /path/to/your-private-key.key ubuntu@<your-instance-public-ip>
```
(Find the public IP on the instance's detail page in the console.)

## 4. Install Node.js and get your code onto the server

```bash
# Update packages and install Node.js
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Confirm
node --version
```

Get your project onto the instance — easiest is pushing it to a GitHub repo first, then:
```bash
git clone <your-repo-url>
cd ideaforge/backend
npm install
```

**Note if you chose the ARM-based "Always Free" Ampere shape:** `better-sqlite3` (the database driver) normally downloads a ready-made binary for your platform, but Oracle's ARM instances sometimes don't have a prebuilt one available, which forces `npm install` to compile it from source instead. If `npm install` fails with errors mentioning `node-gyp`, `make`, or a missing compiler, install the build tools first and try again:
```bash
sudo apt install -y build-essential python3
npm install
```

(If you'd rather not use git, you can `scp` the project folder up instead — ask if you want the exact command.)

## 5. Run the server

For a quick test:
```bash
cp .env.example .env
nano .env    # set NODE_ENV=production and change JWT_SECRET to something random
npm start
```
With `NODE_ENV=production` set, the server will now refuse to start if `JWT_SECRET` is still the default value - that's intentional, so you can't accidentally deploy with a publicly-known secret.

Visit `http://<your-instance-public-ip>:3000` — you should see the app.

Press `Ctrl+C` to stop it — that's just a test run. For it to stay running after you disconnect, use a process manager:

```bash
sudo npm install -g pm2
pm2 start server.js --name ideaforge
pm2 save
pm2 startup    # follow the printed instructions to enable auto-start on reboot
```

## 6. (Optional but recommended) Put it on port 80

Visiting `your-ip:3000` works, but `your-ip` alone (port 80, the default web port) looks more like a real deployed app. Two options:
- Quickest: change `PORT=80` in `.env` and re-open port 80 instead of 3000 in the security list (step 2). Running on port 80 needs `sudo`, so run pm2 with `sudo`.
- Better practice: install `nginx` as a reverse proxy on port 80 that forwards to your app on port 3000. This is a more "production" setup and a good thing to mention if asked how you'd harden this further.

## 7. Verify it's really live

From your own machine (not the server), open `http://<your-instance-public-ip>` (or `:3000`) in a browser. Try signing up and posting an idea for real. This URL is what you'd put in your resume/portfolio and be ready to open live in an interview.

## What to say about this in an interview

Be ready to explain, in your own words: what a compute instance is, why the security list had to be opened, what `pm2` does and why the app needs a process manager instead of just running `node server.js` in a terminal you close, and what SSH keys are for. You don't need to be a cloud expert — you need to be able to explain the handful of decisions you actually made, calmly.
