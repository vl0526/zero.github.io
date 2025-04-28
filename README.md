# Subtitle Generator Production

This project implements a subtitle generator using Google Gemini, Google Cloud Pub/Sub, Secret Manager, Cloud Storage, and Cloud Run, with CI/CD managed by GitHub Actions and infrastructure by Terraform.

## Project Structure

project-root/├── frontend/         # Frontend application (HTML, CSS, TypeScript)├── backend/          # Backend API and worker (Express, Pub/Sub, Gemini integration)├── .github/          # GitHub Actions workflows├── terraform/        # Terraform infrastructure code└── README.md         # Project documentation
## Services Used

* **Google Gemini API:** For generating subtitles from audio/video content.
* **Google Cloud Pub/Sub:** Decoupling the API request from the background processing worker.
* **Google Cloud Secret Manager:** Securely storing the Gemini API key.
* **Google Cloud Storage:** Storing the generated SRT subtitle files.
* **Google Cloud Run:** Hosting the backend API and potentially the worker.
* **GitHub Actions:** Continuous Integration and Continuous Deployment pipeline.
* **Terraform:** Infrastructure as Code for provisioning GCP resources.

## Setup

### 1. Google Cloud Project

* Create a new Google Cloud project.
* Enable the following APIs:
    * Secret Manager API
    * Pub/Sub API
    * Cloud Storage API
    * Cloud Run API
    * Identity and Access Management (IAM) API
    * (Potentially) Google Cloud Speech-to-Text API or the specific Gemini API for audio/video transcription if `@google/genai` client is not sufficient.

### 2. Terraform

* Install Terraform: [https://developer.hashicorp.com/terraform/downloads](https://developer.hashicorp.com/terraform/downloads)
* Obtain your Google Gemini API key.
* Navigate to the `terraform` directory.
* Initialize Terraform:
    ```bash
    cd terraform
    terraform init
    ```
* Review the plan and apply the infrastructure:
    ```bash
    terraform apply \
      -var="project_id=YOUR_GCP_PROJECT_ID" \
      -var="region=asia-east2" \
      -var="gemini_key=YOUR_GEMINI_API_KEY"
    ```
    Replace `YOUR_GCP_PROJECT_ID` with your actual project ID and `YOUR_GEMINI_API_KEY` with your Gemini key. Be cautious with handling the API key; using Secret Manager directly in code (as intended by `secrets.ts`) is more secure than passing it as a Terraform variable if you are concerned about state file security. The provided Terraform *does* use a variable but immediately puts it into Secret Manager.
* Note the outputs, especially `gemini_secret_name` and `results_bucket_name`.

### 3. Google Cloud IAM (for Cloud Run Service Account)

* The Terraform code creates a service account for the Cloud Run service (`subtitle-backend-sa`).
* Ensure this service account has the necessary roles:
    * `roles/secretmanager.secretAccessor` (Granted by Terraform)
    * `roles/pubsub.publisher` (Granted by Terraform)
    * `roles/storage.objectAdmin` or `roles/storage.objectCreator` for the results bucket. (You may need to add this manually or via Terraform).
    * Permissions to call the Gemini API (e.g., `roles/aiplatform.user` or specific roles depending on the API used).

### 4. Google Cloud IAM (for Pub/Sub Worker Service Account)

* If your worker is a separate service (e.g., Cloud Function, another Cloud Run service), it will need its own service account.
* Grant this worker service account the following roles:
    * `roles/pubsub.subscriber` on the `subtitle-workers` subscription.
    * `roles/secretmanager.secretAccessor` on the `gemini_api_key` secret (if using `secrets.ts` in the worker).
    * Permissions to call the Gemini API.
    * `roles/storage.objectAdmin` or `roles/storage.objectCreator` on the results bucket.

### 5. GitHub Actions Secrets

* In your GitHub repository settings, add the following repository secrets:
    * `GCP_PROJECT`: Your Google Cloud project ID.
    * `WORKLOAD_IDENTITY_PROVIDER`: The full resource name of your Workload Identity Provider (created separately, e.g., `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID`).
    * `GCP_SA_EMAIL`: The email of the Google Cloud service account used by GitHub Actions (this service account needs permissions to build/push Docker images and deploy to Cloud Run).
    * `GEMINI_SECRET_NAME`: The full resource name of the Secret Manager secret containing the Gemini API key (outputted by Terraform).

### 6. Local Development

* **Frontend:**
    ```bash
    cd frontend
    npm install
    npm start # Serves the frontend on http://localhost:3000
    ```
* **Backend:**
    ```bash
    cd backend
    npm install
    npm run build
    # Ensure environment variables or credentials are set for GCP services (Pub/Sub, Secret Manager, Storage)
    # You might need to set GOOGLE_APPLICATION_CREDENTIALS environment variable pointing to a service account key file
    # or use 'gcloud auth application-default login' for local development.
    node dist/index.js # Starts the backend API on http://localhost:8080
    ```
* **Worker:**
    * The worker is designed to run as a background process (e.g., Cloud Function triggered by Pub/Sub, or a dedicated Cloud Run service that subscribes).
    * To run locally, you would need to set up your environment to receive Pub/Sub messages (e.g., using a Pub/Sub emulator or pulling from the actual subscription) and ensure GCP credentials are configured.

## Deployment

Deployment is automated via the GitHub Actions workflow (`.github/workflows/ci-cd.yml`).
On every push to the repository, the workflow will:

1.  Checkout code.
2.  Set up Node.js.
3.  Install and build frontend (placeholder).
4.  Install and build backend.
5.  Authenticate to GCP using Workload Identity Federation.
6.  Configure Docker.
7.  Build the backend Docker image and push it to Google Container Registry (GCR).
8.  Deploy the latest image to the Cloud Run service (`subtitle-backend`).

The Cloud Run service is configured to use the `GEMINI_API_KEY` from Secret Manager (if configured via IAM and `secrets.ts`) or as an environment variable injected during deployment (if using `--set-secrets` in the GitHub Actions workflow).

## Notes

* **Gemini API for Audio/Video:** The current implementation uses `@google/genai` and a text model placeholder. You will need to integrate with the correct Google Cloud Speech-to-Text API or a multimodal Gemini endpoint designed for audio/video transcription. This will likely involve uploading the file to GCS first and providing a GCS URI to the transcription API.
* **Worker Implementation:** The `worker.ts` file is a skeleton. The core logic for interacting with the transcription API, chunking large files, and handling progress updates needs to be implemented.
* **SSE Notification:** The mechanism for the worker to notify the API instance via SSE needs refinement for a distributed environment like Cloud Run. A separate Pub/Sub topic for results/progress is the standard approach.
* **Error Handling:** Add more robust error handling in both frontend and backend.
* **Authentication/Authorization:** Consider adding authentication and authorization for the API if it's not intended for public use.
* **Frontend Hosting:** The frontend is assumed to be served statically. You can serve it from the backend Cloud Run service, a separate Cloud Storage bucket with Cloud CDN, or another hosting option.
