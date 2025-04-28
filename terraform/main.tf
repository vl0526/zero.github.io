# Configure the Google Cloud provider
provider "google" {
  project = var.project_id # Use the project_id variable
  region  = var.region     # Use the region variable
}

# Define variables
variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region to deploy resources"
  type        = string
  default     = "asia-east2" # Default region
}

variable "gemini_key" {
  description = "Your Google Gemini API key"
  type        = string
  sensitive   = true # Mark as sensitive to prevent logging
}

# --- Secret Manager ---
# Create a Secret Manager secret for the Gemini API key
resource "google_secret_manager_secret" "gemini_api" {
  secret_id = "gemini_api_key" # Name of the secret
  replication {
    automatic = true # Automatically replicate the secret
  }
  labels = {
    environment = "production"
  }
}

# Add a version to the secret with the actual key data
resource "google_secret_manager_secret_version" "gemini_api_version" {
  secret      = google_secret_manager_secret.gemini_api.id # Reference the secret resource
  secret_data = var.gemini_key                             # Use the sensitive variable for the key data
}

# Output the secret name for use in CI/CD or Cloud Run configuration
output "gemini_secret_name" {
  description = "The full resource name of the Gemini API key secret"
  value       = google_secret_manager_secret.gemini_api.id
}


# --- Pub/Sub ---
# Create a Pub/Sub topic for subtitle job messages
resource "google_pubsub_topic" "jobs" {
  name = "subtitle-jobs" # Name of the topic
  labels = {
    environment = "production"
  }
}

# Create a Pub/Sub subscription for workers to pull messages from the jobs topic
resource "google_pubsub_subscription" "workers" {
  name  = "subtitle-workers" # Name of the subscription
  topic = google_pubsub_topic.jobs.name # Reference the topic name
  ack_deadline_seconds = 600 # Increase ACK deadline if processing takes longer
  enable_exactly_once_delivery = true # Ensure messages are processed exactly once

  labels = {
    environment = "production"
  }
}

# --- Cloud Storage ---
# Create a Cloud Storage bucket to store the generated SRT files
resource "google_storage_bucket" "subtitle_results" {
  name          = "subtitle-results-${var.project_id}" # Unique bucket name (add project ID for uniqueness)
  location      = var.region
  storage_class = "STANDARD"
  uniform_bucket_level_access = true # Recommended for security

  labels = {
    environment = "production"
  }
}

# Output the bucket name
output "results_bucket_name" {
  description = "Name of the GCS bucket for subtitle results"
  value       = google_storage_bucket.subtitle_results.name
}


# --- Cloud Run ---
# Create a Cloud Run service for the backend API
resource "google_cloud_run_service" "backend" {
  name     = "subtitle-backend" # Name of the Cloud Run service
  location = var.region         # Deploy in the specified region

  template {
    spec {
      containers {
        # Image URL (replace with your GCR path)
        image = "gcr.io/${var.project_id}/subtitle-backend:latest"

        # Configure environment variables
        env {
          name = "PORT" # Cloud Run expects the app to listen on the PORT env var
          value = "8080" # Match the port your Express app listens on
        }

        # Option 1: Pass secret as environment variable (less secure, requires `--set-secrets` in gcloud deploy or similar config)
        # env {
        #   name = "GEMINI_API_KEY"
        #   value_from {
        #     secret_key_ref {
        #       name = google_secret_manager_secret.gemini_api.secret_id
        #       version = "latest"
        #     }
        #   }
        # }

        # Option 2: Use Secret Manager API in code (more secure, requires IAM permissions)
        # No env var config needed here if using secrets.ts with IAM.
      }
      # Configure service account for the Cloud Run service
      # Ensure this service account has permissions for Pub/Sub, Secret Manager, and Cloud Storage
      service_account_name = google_service_account.cloud_run_sa.email
      timeout_seconds = 300 # Increase timeout for long-running requests
    }
  }

  # Configure traffic splitting (send 100% to the latest revision)
  traffics {
    percent = 100
    latest_revision = true
  }

  # Allow unauthenticated access (if needed, e.g., for a public API)
  # For production, consider IAP or other authentication methods
  autogenerate_revision_name = true # Automatically generate revision names
}

# Create a service account for Cloud Run
resource "google_service_account" "cloud_run_sa" {
  account_id   = "subtitle-backend-sa" # Desired service account ID
  display_name = "Service Account for Subtitle Backend Cloud Run"
}

# Grant the Cloud Run service account permissions to access the Secret Manager secret
resource "google_secret_manager_secret_iam_member" "secret_accessor" {
  secret_id = google_secret_manager_secret.gemini_api.id
  role      = "roles/secretmanager.secretAccessor" # Role to access secret versions
  member    = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Grant the Cloud Run service account permissions to publish to the Pub/Sub jobs topic
resource "google_pubsub_topic_iam_member" "publisher" {
  topic  = google_pubsub_topic.jobs.name
  role   = "roles/pubsub.publisher" # Role to publish messages
  member = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Grant the Cloud Run service account permissions to subscribe to the Pub/Sub results topic (if implementing results topic)
# resource "google_pubsub_subscription_iam_member" "subscriber" {
#   subscription = google_pubsub_subscription.results.name # Assuming a 'results' subscription
#   role         = "roles/pubsub.subscriber" # Role to pull messages
#   member       = "serviceAccount:${google_service_account.cloud_run_sa.email}"
# }


# --- Worker (Example - could be Cloud Functions, Cloud Run Job, or another Cloud Run service) ---
# This Terraform doesn't explicitly define the worker deployment, as it depends
# on your chosen compute platform (e.g., Cloud Functions triggered by Pub/Sub,
# a separate Cloud Run service, or a Cloud Run Job).
# However, the worker needs permissions:
# - To subscribe to the 'subtitle-workers' Pub/Sub subscription.
# - To access the Secret Manager secret (if using getSecret).
# - To call the Gemini API.
# - To write to the Cloud Storage results bucket.

# Example IAM for a potential worker service account (adjust member based on compute type)
/*
resource "google_service_account" "worker_sa" {
  account_id   = "subtitle-worker-sa"
  display_name = "Service Account for Subtitle Worker"
}

resource "google_pubsub_subscription_iam_member" "worker_subscriber" {
  subscription = google_pubsub_subscription.workers.name
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:${google_service_account.worker_sa.email}" # Or 'serviceAccount:PROJECT_ID@cloudfunctions.gserviceaccount.com' etc.
}

resource "google_secret_manager_secret_iam_member" "worker_secret_accessor" {
  secret_id = google_secret_manager_secret.gemini_api.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.worker_sa.email}"
}

resource "google_storage_bucket_iam_member" "worker_storage_writer" {
  bucket = google_storage_bucket.subtitle_results.name
  role   = "roles/storage.objectAdmin" # Or storage.objectCreator
  member = "serviceAccount:${google_service_account.worker_sa.email}"
}
*/


# --- Frontend Hosting (Example - Could be Cloud Storage + CDN, or served by backend) ---
# This Terraform doesn't explicitly define frontend hosting.
# If serving from Cloud Storage:
/*
resource "google_storage_bucket" "frontend_bucket" {
  name          = "subtitle-frontend-${var.project_id}"
  location      = var.region
  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html"
  }
  uniform_bucket_level_access = true
}

resource "google_storage_bucket_iam_member" "frontend_public_access" {
  bucket = google_storage_bucket.frontend_bucket.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# Consider adding Cloud CDN for better performance
*/

# Output the Cloud Run service URL
output "backend_url" {
  description = "The URL of the Cloud Run service"
  value       = google_cloud_run_service.backend.status[0].url
}
