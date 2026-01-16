# ========================================
# Kubernetes RBAC for Infrastructure Provisioner
# ========================================
# Allows the infrastructure-provisioner service to manage tenant namespaces
# and deploy resources across the cluster

# ClusterRole: Defines permissions for managing tenant resources
resource "kubernetes_cluster_role" "provisioning_service" {
  metadata {
    name = "provisioning-service-role"
    labels = {
      app       = "provisioning-service"
      component = "rbac"
      managed_by = "terraform"
    }
  }

  # Namespace management
  rule {
    api_groups = [""]
    resources  = ["namespaces"]
    verbs      = ["get", "list", "create"]
  }

  # Secret management (create tenant-specific secrets in any namespace)
  rule {
    api_groups = [""]
    resources  = ["secrets"]
    verbs      = ["get", "list", "create"]
  }

  # Service account management (for Workload Identity binding)
  rule {
    api_groups = [""]
    resources  = ["serviceaccounts"]
    verbs      = ["get", "list", "create"]
  }

  # ConfigMap management (for Helm configurations)
  rule {
    api_groups = [""]
    resources  = ["configmaps"]
    verbs      = ["get", "list", "create"]
  }

  # Deployment management (for Helm releases)
  rule {
    api_groups = ["apps"]
    resources  = ["deployments", "replicasets", "statefulsets"]
    verbs      = ["get", "list", "create"]
  }

  # Service management
  rule {
    api_groups = [""]
    resources  = ["services", "pods"]
    verbs      = ["get", "list", "create"]
  }

  # HPA (Horizontal Pod Autoscaler) management
  rule {
    api_groups = ["autoscaling"]
    resources  = ["horizontalpodautoscalers"]
    verbs      = ["get", "list", "create"]
  }

  # Ingress management
  rule {
    api_groups = ["networking.k8s.io"]
    resources  = ["ingresses"]
    verbs      = ["get", "list", "create"]
  }

  # Gateway API resources (GKE Gateway)
  rule {
    api_groups = ["gateway.networking.k8s.io"]
    resources  = ["gateways", "httproutes", "gatewayclasses"]
    verbs      = ["get", "list", "create"]
  }

  # PersistentVolumeClaim management
  rule {
    api_groups = [""]
    resources  = ["persistentvolumeclaims"]
    verbs      = ["get", "list", "create"]
  }

  depends_on = [
    google_container_cluster.primary
  ]
}

# ClusterRoleBinding: Binds the ClusterRole to the provisioner service account
resource "kubernetes_cluster_role_binding" "provisioning_service_binding" {
  metadata {
    name = "provisioning-service-binding"
    labels = {
      app        = "provisioning-service"
      component  = "rbac"
      managed_by = "terraform"
    }
  }

  # Bind to the ClusterRole
  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.provisioning_service.metadata[0].name
  }

  # Subject: The infrastructure-provisioner service account in default namespace
  subject {
    kind      = "ServiceAccount"
    name      = "provisioning-service-sa"
    namespace = "default"
  }

  depends_on = [
    kubernetes_cluster_role.provisioning_service,
    module.provisioning_service_account
  ]
}
