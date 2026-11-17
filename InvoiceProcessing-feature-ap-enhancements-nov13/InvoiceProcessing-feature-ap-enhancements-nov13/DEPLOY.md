# Deploying Finance Command Center to Cloud Run

Two Cloud Run services in project `kpmg-tt-dsdn-agents`, region `asia-south1`:

| Service | Folder | What it runs |
|---|---|---|
| `fcc-backend` | `backend/` | FastAPI (uvicorn) — talks to Cloud SQL, Gemini, Zoho Books |
| `fcc-frontend` | `app/` | The built React app (`vite preview`), forwarding `/api` to `fcc-backend` |

Other pieces:

- **Database:** a new database `financecommandcenterhub` (user `fcc_app`) on the existing Cloud SQL instance `recon-postgres`. The app creates its tables itself on first start.
- **Uploaded invoices:** Cloud Storage bucket `kpmg-tt-dsdn-agents-fcc-documents`, mounted into the backend at `/mnt/documents`. Cloud Run's own disk is wiped on every restart.

The service names are `fcc-*` so they never overwrite the `recon-*` services of the other project.

---

## A. On your laptop — prepare the upload

1. Fill in `backend/cloudrun-backend.env.yaml`:
   - the four secrets, copied from `backend/.env`: `GEMINI_API_KEY`, `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`;
   - `DB_PASSWORD` inside `DATABASE_URL`: the password you will give `fcc_app` in step B2.
2. Build the zip. From the `finance-command-center\finance-command-center` folder, run:
   ```
   powershell -ExecutionPolicy Bypass -File make-deploy-zip.ps1
   ```
   This writes `Downloads\finance-command-center\fcc-deploy.zip`. It holds only `app/`, `backend/` and this file: no `node_modules`, `.venv`, `.env` or local data.
3. Open Cloud Shell (console.cloud.google.com, then the `>_` icon). Use the ⋮ menu → **Upload** to upload `fcc-deploy.zip`.

## B. In Cloud Shell — one-time setup (first deployment only)

```bash
gcloud config set project kpmg-tt-dsdn-agents

# B1. Unzip
unzip -o fcc-deploy.zip && cd finance-command-center

# B2. Database and user on the existing Cloud SQL instance (use the same password as in DATABASE_URL)
gcloud sql databases create financecommandcenterhub --instance=recon-postgres
gcloud sql users create fcc_app --instance=recon-postgres --password='CHOOSE_A_STRONG_PASSWORD'

# B3. Bucket for uploaded invoices, writable by the Cloud Run service account
gcloud storage buckets create gs://kpmg-tt-dsdn-agents-fcc-documents \
  --location=asia-south1 --uniform-bucket-level-access
gcloud storage buckets add-iam-policy-binding gs://kpmg-tt-dsdn-agents-fcc-documents \
  --member=serviceAccount:133379243863-compute@developer.gserviceaccount.com \
  --role=roles/storage.objectAdmin
```

## C. Deploy the backend

```bash
cd ~/finance-command-center/backend

gcloud run deploy fcc-backend \
  --source . \
  --region asia-south1 \
  --service-account 133379243863-compute@developer.gserviceaccount.com \
  --add-cloudsql-instances kpmg-tt-dsdn-agents:asia-south1:recon-postgres \
  --env-vars-file cloudrun-backend.env.yaml \
  --set-build-env-vars GOOGLE_ENTRYPOINT="uvicorn app.main:app --host 0.0.0.0 --port 8080" \
  --execution-environment gen2 \
  --add-volume name=documents,type=cloud-storage,bucket=kpmg-tt-dsdn-agents-fcc-documents \
  --add-volume-mount volume=documents,mount-path=/mnt/documents \
  --no-cpu-throttling \
  --min-instances 1 \
  --max-instances 1 \
  --memory 1Gi \
  --cpu 1 \
  --concurrency 10 \
  --timeout 900 \
  --allow-unauthenticated
```

Why the extra flags, compared with the other project:

- **`--add-volume` / `--add-volume-mount` / `--execution-environment gen2`:** uploaded invoice PDFs are stored in the bucket, so they survive restarts.
- **`--no-cpu-throttling` and `--min-instances 1`:** an invoice is processed in the background after the upload request has returned. Without these flags, Cloud Run would pause that work.
- **`--max-instances 1`:** invoices are validated strictly in arrival order, and the Zoho refresh cache lives in one process. Keep one instance.

When the deploy finishes, copy the **Service URL** it prints, for example `https://fcc-backend-xxxxx.asia-south1.run.app`. To print it again later:

```bash
gcloud run services describe fcc-backend --region asia-south1 --format='value(status.url)'
```

Check it: `curl <that URL>/api/config` should return JSON.

## D. Deploy the frontend

1. Put the backend URL in `app/cloudrun-frontend.env.yaml` (`VITE_API_TARGET`). You can edit it in Cloud Shell with `nano` or the Cloud Shell Editor.
2. Deploy:

```bash
cd ~/finance-command-center/app

gcloud run deploy fcc-frontend \
  --source . \
  --region asia-south1 \
  --service-account 133379243863-compute@developer.gserviceaccount.com \
  --env-vars-file cloudrun-frontend.env.yaml \
  --memory 1Gi \
  --cpu 1 \
  --concurrency 20 \
  --timeout 900 \
  --allow-unauthenticated
```

Open the **fcc-frontend** Service URL it prints: that is the app. Then click **Enterprise Connect → Sync now** once, to load GENSTAR's data into the new database.

## E. Later updates

On your laptop, run `make-deploy-zip.ps1` again, then upload the zip. In Cloud Shell:

```bash
unzip -o fcc-deploy.zip
cd ~/finance-command-center/backend && gcloud run deploy fcc-backend ...   # same command as C
cd ~/finance-command-center/app && gcloud run deploy fcc-frontend ...      # same command as D
```

Only redeploy the service whose folder changed. Section B is never repeated.

## Notes

- **Logs:** Cloud Run → `fcc-backend` → **Logs** shows the same console output you see locally, for example the Zoho refresh warnings.
- **Access control:** the app has no login of its own yet; the "Acting as" switcher is for testing. With `--allow-unauthenticated`, anyone with the URL can use it, including posting bills to GENSTAR. For anything beyond a demo, put it behind IAP or remove `--allow-unauthenticated`.
- **Secrets:** `cloudrun-backend.env.yaml` holds your keys. `.gcloudignore` keeps it out of the source upload (gcloud reads it only to set environment variables), and `.gitignore` keeps it out of git. Delete it from Cloud Shell after deploying if the shell is shared.
