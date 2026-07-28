# QuantumVest Kubernetes Manifests

## Overview

This directory contains Kubernetes manifests for deploying QuantumVest application stack.

## Prerequisites

### Required Tools

```bash
# kubectl v1.25+
kubectl version --client

# Helm v3.12+
helm version

# Optional: kubeval for validation
kubeval --version
```

### Cluster Access

```bash
# Verify cluster access
kubectl cluster-info
kubectl get nodes

# Set namespace context (optional)
kubectl config set-context --current --namespace=quantumvest-production
```

## Directory Structure

```
kubernetes/
├── README.md                    # This file
├── Chart.yaml                   # Helm chart metadata
├── values.yaml                  # Default (dev-like) values
├── templates/                   # Helm templates
│   ├── app-configmap.yaml      # Application configuration
│   ├── app-secrets.yaml        # Secrets (DO NOT commit actual secrets)
│   ├── app-secrets.example.yaml # Secret template
│   ├── backend-deployment.yaml  # Backend service
│   ├── backend-service.yaml     # Backend Service
│   ├── database-service.yaml    # Database Service
│   ├── database-statefulset.yaml # MySQL StatefulSet
│   ├── frontend-deployment.yaml # Frontend service
│   ├── frontend-service.yaml    # Frontend Service
│   ├── ingress.yaml            # Ingress rules
│   ├── redis-deployment.yaml    # Redis deployment
│   ├── redis-pvc.yaml          # Redis storage
│   ├── redis-service.yaml       # Redis Service
│   └── rbac.yaml               # RBAC policies
└── environments/                # Per-environment value overrides
    ├── dev/
    │   └── values.yaml
    ├── staging/
    │   └── values.yaml
    └── prod/
        └── values.yaml
```

## Quick Start

### 1. Prepare Secrets

`templates/app-secrets.yaml` is a Helm template — it reads plaintext values
like `.Values.database.rootPassword` and base64-encodes them itself via the
`b64enc` function. You never hand-encode or edit `app-secrets.yaml` directly;
instead supply the plaintext secrets Helm should inject, either with `--set`
or (better, for anything beyond local dev) a separate, untracked values file:

```bash
cat > secrets.local.yaml << EOF
database:
  url: "mysql+pymysql://appuser:\$(openssl rand -base64 24)@quantumvest-database:3306/quantumvestdb"
  rootPassword: "$(openssl rand -base64 24)"
  password: "$(openssl rand -base64 24)"
redis:
  url: "redis://:$(openssl rand -base64 24)@quantumvest-redis:6379/0"
backend:
  jwtSecret: "$(openssl rand -base64 32)"
  apiKey: "$(openssl rand -base64 32)"
  encryptionKey: "$(openssl rand -base64 32)"
EOF

# Pass it alongside the environment values file at install time (see below):
#   helm install quantumvest . -f environments/dev/values.yaml -f secrets.local.yaml
# Never commit secrets.local.yaml.
```

`templates/app-secrets.example.yaml` documents the full set of expected keys.

### 2. Validate Manifests

kubectl and kubeval can't parse the raw templates directly (they contain
literal `{{ .Values.x }}` syntax, which isn't valid YAML/Kubernetes on its
own) — render them with `helm template` first, then validate the output:

```bash
# Lint the chart itself (catches template/values errors)
helm lint . --values environments/dev/values.yaml

# Render, then validate the rendered manifests
helm template quantumvest . --values environments/dev/values.yaml > /tmp/rendered.yaml
kubectl apply --dry-run=client -f /tmp/rendered.yaml
kubeval /tmp/rendered.yaml   # if installed
```

### 3. Deploy to Cluster

```bash
# Create namespace
kubectl create namespace quantumvest-dev

# Deploy with Helm
helm install quantumvest . \
  --namespace quantumvest-dev \
  --create-namespace \
  --values environments/dev/values.yaml
```

### 4. Verify Deployment

```bash
# Check pod status
kubectl get pods -n quantumvest-dev

# Check services
kubectl get svc -n quantumvest-dev

# Check ingress
kubectl get ingress -n quantumvest-dev

# View pod logs
kubectl logs -f deployment/quantumvest-backend -n quantumvest-dev

# Describe pod for issues
kubectl describe pod <pod-name> -n quantumvest-dev
```

## Deployment Methods

This chart is Helm-templated (`{{ .Values.x }}` throughout `templates/`), so
Helm is the only way to render or deploy it — `kubectl apply -f templates/`
won't work (kubectl has no concept of Helm templating), and neither does
Kustomize (it doesn't process Helm syntax either).

```bash
# Preview the rendered manifests without deploying anything
helm template quantumvest . --values environments/dev/values.yaml

# Install
helm install quantumvest . \
  --namespace quantumvest-production \
  --create-namespace \
  --values environments/prod/values.yaml

# Upgrade
helm upgrade quantumvest . \
  --namespace quantumvest-production \
  --values environments/prod/values.yaml

# Rollback
helm rollback quantumvest 1 -n quantumvest-production

# Uninstall
helm uninstall quantumvest -n quantumvest-production
```

## Environment Configuration

### Development

```bash
# Small resource limits
# Single replicas
# No autoscaling
helm install quantumvest . \
  --namespace quantumvest-dev \
  --values environments/dev/values.yaml
```

### Staging

```bash
# Medium resources
# 2 replicas
# Autoscaling enabled
helm install quantumvest . \
  --namespace quantumvest-staging \
  --values environments/staging/values.yaml
```

### Production

```bash
# Full resources
# 3+ replicas
# Autoscaling + anti-affinity
# Full monitoring
helm install quantumvest . \
  --namespace quantumvest-production \
  --values environments/prod/values.yaml
```

## Secrets Management

### Local Development (kubectl)

```bash
# Create secret from literals
kubectl create secret generic quantumvest-secrets \
  --from-literal=database-url="mysql+pymysql://..." \
  --from-literal=jwt-secret="your-secret" \
  -n quantumvest-dev

# Create secret from file
kubectl create secret generic quantumvest-secrets \
  --from-file=database-url=./db-url.txt \
  --from-file=jwt-secret=./jwt.txt \
  -n quantumvest-dev

# View secret (base64 encoded)
kubectl get secret quantumvest-secrets -o yaml -n quantumvest-dev

# Decode secret
kubectl get secret quantumvest-secrets -o jsonpath='{.data.jwt-secret}' -n quantumvest-dev | base64 -d
```

### Production (External Secrets)

```bash
# Using HashiCorp Vault
# See: https://www.vaultproject.io/docs/platform/k8s

# Using AWS Secrets Manager
# See: https://github.com/external-secrets/external-secrets

# Using Sealed Secrets
# See: https://github.com/bitnami-labs/sealed-secrets
```

## Monitoring & Logging

### View Logs

```bash
# Pod logs
kubectl logs -f deployment/quantumvest-backend -n quantumvest-production

# Multiple containers
kubectl logs -f deployment/quantumvest-backend -c backend -n quantumvest-production

# Previous container logs (crashed pods)
kubectl logs --previous <pod-name> -n quantumvest-production

# All pods with label
kubectl logs -l app=quantumvest-backend -n quantumvest-production --tail=100
```

### Metrics & Health

```bash
# Pod resource usage
kubectl top pods -n quantumvest-production

# Node resource usage
kubectl top nodes

# Check pod readiness
kubectl get pods -n quantumvest-production -o wide

# Port forward for local testing
kubectl port-forward svc/quantumvest-backend 8080:80 -n quantumvest-production
```

### Debug Pod Issues

```bash
# Describe pod
kubectl describe pod <pod-name> -n quantumvest-production

# Get events
kubectl get events -n quantumvest-production --sort-by='.lastTimestamp'

# Execute command in pod
kubectl exec -it <pod-name> -n quantumvest-production -- /bin/sh

# Debug with ephemeral container
kubectl debug <pod-name> -it --image=busybox -n quantumvest-production
```

## Scaling

### Manual Scaling

```bash
# Scale deployment
kubectl scale deployment quantumvest-backend --replicas=5 -n quantumvest-production

# Scale statefulset
kubectl scale statefulset quantumvest-database --replicas=3 -n quantumvest-production
```

### Autoscaling (HPA)

```bash
# Create HPA
kubectl autoscale deployment quantumvest-backend \
  --cpu-percent=70 \
  --min=3 \
  --max=20 \
  -n quantumvest-production

# Check HPA status
kubectl get hpa -n quantumvest-production

# Describe HPA
kubectl describe hpa quantumvest-backend -n quantumvest-production
```

## Updates & Rollouts

### Rolling Update

```bash
# Update image
kubectl set image deployment/quantumvest-backend \
  backend=ghcr.io/quantumvest/backend:v2.0.0 \
  -n quantumvest-production

# Check rollout status
kubectl rollout status deployment/quantumvest-backend -n quantumvest-production

# View rollout history
kubectl rollout history deployment/quantumvest-backend -n quantumvest-production
```

### Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/quantumvest-backend -n quantumvest-production

# Rollback to specific revision
kubectl rollout undo deployment/quantumvest-backend --to-revision=2 -n quantumvest-production

# Pause rollout
kubectl rollout pause deployment/quantumvest-backend -n quantumvest-production

# Resume rollout
kubectl rollout resume deployment/quantumvest-backend -n quantumvest-production
```

## Troubleshooting

### Pod Not Starting

```bash
# Check pod events
kubectl describe pod <pod-name> -n quantumvest-production

# Common issues:
# - ImagePullBackOff: Check image name/tag, imagePullSecrets
# - CrashLoopBackOff: Check logs, liveness/readiness probes
# - Pending: Check resource requests, node capacity, PVC binding
```

### Service Not Accessible

```bash
# Check service endpoints
kubectl get endpoints quantumvest-backend -n quantumvest-production

# Check if pods are ready
kubectl get pods -l app=quantumvest-backend -n quantumvest-production

# Test service from within cluster
kubectl run -it --rm debug --image=busybox -n quantumvest-production \
  -- wget -qO- http://quantumvest-backend:80/api/v1/health
```

### Ingress Issues

```bash
# Check ingress
kubectl describe ingress quantumvest-ingress -n quantumvest-production

# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller

# Verify DNS
nslookup quantumvest.com
```

### Resource Limits

```bash
# Check if pods are being OOMKilled
kubectl get pods -n quantumvest-production | grep OOMKilled

# Check resource usage
kubectl top pods -n quantumvest-production

# Increase limits in deployment
kubectl edit deployment quantumvest-backend -n quantumvest-production
```

## Security

### RBAC

```bash
# View service accounts
kubectl get serviceaccounts -n quantumvest-production

# View roles
kubectl get roles -n quantumvest-production

# View role bindings
kubectl get rolebindings -n quantumvest-production

# Test permissions
kubectl auth can-i get pods --as=system:serviceaccount:quantumvest-production:quantumvest-backend
```

### Network Policies

```bash
# View network policies
kubectl get networkpolicies -n quantumvest-production

# Describe policy
kubectl describe networkpolicy quantumvest-backend-netpol -n quantumvest-production

# Test connectivity
kubectl run -it --rm debug --image=busybox -n quantumvest-production \
  -- wget -qO- --timeout=5 http://quantumvest-backend:80/api/v1/health
```

### Pod Security

```bash
# Check security context
kubectl get pod <pod-name> -n quantumvest-production -o jsonpath='{.spec.securityContext}'

# Check container security context
kubectl get pod <pod-name> -n quantumvest-production -o jsonpath='{.spec.containers[*].securityContext}'
```

## Backup & Recovery

### Database Backup

```bash
# Create manual backup
kubectl exec -it quantumvest-database-0 -n quantumvest-production -- \
  mysqldump -u root -p quantumvest > backup.sql

# Restore from backup
kubectl exec -i quantumvest-database-0 -n quantumvest-production -- \
  mysql -u root -p quantumvest < backup.sql
```

### PVC Snapshot

```bash
# Create snapshot (requires VolumeSnapshot CRD)
kubectl create -f - <<EOF
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: quantumvest-db-snapshot
  namespace: quantumvest-production
spec:
  volumeSnapshotClassName: csi-snapclass
  source:
    persistentVolumeClaimName: quantumvest-database-data
EOF
```

## Maintenance

### Drain Node

```bash
# Drain node for maintenance
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Uncordon node
kubectl uncordon <node-name>
```

### Clean Up

```bash
# Delete failed pods
kubectl delete pods --field-selector status.phase=Failed -n quantumvest-production

# Delete completed jobs
kubectl delete jobs --field-selector status.successful=1 -n quantumvest-production

# Delete evicted pods
kubectl get pods -n quantumvest-production | grep Evicted | awk '{print $1}' | xargs kubectl delete pod -n quantumvest-production
```

## Testing

### Smoke Tests

```bash
# Check all pods are running
kubectl wait --for=condition=ready pod -l app=quantumvest-backend -n quantumvest-production --timeout=300s

# Test health endpoints
kubectl run -it --rm curl --image=curlimages/curl -n quantumvest-production \
  -- curl -f http://quantumvest-backend/api/v1/health

# Test frontend
kubectl run -it --rm curl --image=curlimages/curl -n quantumvest-production \
  -- curl -f http://quantumvest-frontend/
```

### Load Testing

```bash
# Install hey
go install github.com/rakyll/hey@latest

# Run load test
hey -n 10000 -c 100 https://quantumvest.com/api/v1/health
```
