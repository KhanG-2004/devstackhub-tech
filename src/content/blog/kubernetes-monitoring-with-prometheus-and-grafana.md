---
order: 7
coverImage: "/wp-content/uploads/2026/08/Gemini_Generated_Image_c33jm6c33jm6c33j-scaled.jpg"
title: "Kubernetes Monitoring with Prometheus and Grafana: 5 Steps to Observability"
seoTitle: "Kubernetes Monitoring with Prometheus and Grafana: 5 Steps to Observability"
description: "Learn how to set up Kubernetes monitoring with Prometheus and Grafana on AKS. A step-by-step production guide covering kube-prometheus-stack Helm deployment, cu"
pubDate: 2026-08-31
category: "Cloud & DevOps"
badge: "PRODUCTION PLAYBOOK"
readTime: "7 MIN READ"
author: "Farraz Ahmed"
---


<p class="wp-block-paragraph">Operating distributed container workloads across ephemeral nodes makes tracking resource consumption, bottleneck identification, and failure diagnosis complex. Without centralized time-series metrics, operations teams face delayed incident responses, unpredicted pod evictions, and unoptimized cloud infrastructure spend. Implementing robust <strong>Kubernetes Monitoring with Prometheus and Grafana</strong> delivers cluster-wide observability, giving platform engineers deep visibility into CPU saturation, memory pressure, network throughput, and application health.</p>



<p class="wp-block-paragraph">While native cloud platform tools provide basic metrics, configuring a dedicated stack for <strong>Kubernetes Monitoring with Prometheus and Grafana</strong> offers granular control over metric retention policies, multi-tenant metric scraping, custom alerting pipelines, and dynamic dashboard creation. This comprehensive technical guide walks through a 5-step, production-hardened blueprint for deploying, configuring, and managing enterprise monitoring on Azure Kubernetes Service (AKS) using the official <code>kube-prometheus-stack</code> Helm operator.</p>



<hr class="wp-block-separator has-alpha-channel-opacity"/>



<h2 class="wp-block-heading">1. Observability Architecture: Prometheus vs Cloud-Native Metrics</h2>



<p class="wp-block-paragraph">Observability in modern container orchestration relies on three pillars: metrics, logs, and distributed traces. Prometheus serves as the metric collection engine, operating on a pull-based scraping mechanism that polls standardized <code>/metrics</code> HTTP endpoints exposed by underlying Kubernetes infrastructure and individual container workloads.</p>



<p class="wp-block-paragraph">Deploying an enterprise architecture for <strong>Kubernetes Monitoring with Prometheus and Grafana</strong> requires understanding how each underlying component interacts across the platform:</p>



<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Component Name</th><th>Core Architectural Role</th><th>Default Endpoint / Port</th><th>Data Flow Type</th></tr></thead><tbody><tr><td><strong>Prometheus Operator</strong></td><td>Manages the lifecycle of Prometheus instances using declarative CRDs</td><td>N/A</td><td>Control Plane Automation</td></tr><tr><td><strong>Prometheus Server</strong></td><td>Scrapes, indexes, and stores time-series metric databases (TSDB)</td><td><code>http://&lt;service&gt;:9090/metrics</code></td><td>Pull-based Metric Collection</td></tr><tr><td><strong>Node Exporter</strong></td><td>Collects hardware-level host metrics (disk I/O, memory, CPU, kernel)</td><td><code>http://&lt;node-ip&gt;:9100/metrics</code></td><td>DaemonSet per Node</td></tr><tr><td><strong>Kube-State-Metrics</strong></td><td>Listens to the Kubernetes API server and generates cluster object metrics</td><td><code>http://&lt;service&gt;:8080/metrics</code></td><td>API Metadata Translation</td></tr><tr><td><strong>Grafana</strong></td><td>Visual analytics platform rendering dynamic dashboards and graphs</td><td><code>http://&lt;service&gt;:3000</code></td><td>Query Interface (PromQL)</td></tr><tr><td><strong>Alertmanager</strong></td><td>Handles alert deduplication, grouping, rate-limiting, and routing</td><td><code>http://&lt;service&gt;:9093</code></td><td>Alert Dispatch Pipeline</td></tr></tbody></table></figure>



<div class="wp-block-uagb-image uagb-block-b592b6ab wp-block-uagb-image--layout-default wp-block-uagb-image--effect-static wp-block-uagb-image--align-none"><figure class="wp-block-uagb-image__figure"><img decoding="async" src="/wp-content/uploads/2026/08/Gemini_Generated_Image_w2n6hdw2n6hdw2n6-1024x559.jpg" alt="" class="uag-image-89" width="2816" height="1536" title="prometheus-grafana-aks-architecture-diagram.webp" loading="lazy" role="img" /><figcaption class="uagb-image-caption">Figure 1: Full-stack Kubernetes observability pipeline connecting container pods to the Prometheus engine, Grafana dashboards, and Alertmanager triggers.</figcaption></figure></div>



<p class="wp-block-paragraph">Configuring <strong>Kubernetes Monitoring with Prometheus and Grafana</strong> ensures your platform team eliminates blind spots across both the physical cloud infrastructure nodes and the ephemeral containerized microservices running inside them.</p>



<hr class="wp-block-separator has-alpha-channel-opacity"/>



<h2 class="wp-block-heading">2. Step 1: Deploying Kubernetes Monitoring with Prometheus and Grafana via Helm</h2>



<p class="wp-block-paragraph">Deploying Prometheus manually using individual Kubernetes Deployment and ConfigMap manifests quickly becomes unmaintainable across multi-node production clusters. The enterprise standard approach utilizes the <code>kube-prometheus-stack</code> Helm chart, which bundles the Prometheus Operator, Grafana, Alertmanager, and essential custom resource definitions (CRDs).</p>



<h3 class="wp-block-heading">2.1 Prepare Storage Class and Namespace</h3>



<p class="wp-block-paragraph">Before configuring <strong>Kubernetes Monitoring with Prometheus and Grafana</strong>, establish an isolated monitoring namespace and confirm dynamic Persistent Volume Claim (PVC) provisioning support on Azure:</p>



<pre class="wp-block-code"><code>#!/usr/bin/env bash
set -euo pipefail

# 1. Create a dedicated monitoring namespace
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

# 2. Add and update the official Prometheus Community Helm repository
helm repo add prometheus-community &#91;https://prometheus-community.github.io/helm-charts](https://prometheus-community.github.io/helm-charts)
helm repo update</code></pre>



<h3 class="wp-block-heading">2.2 Configure Production <code>values.yaml</code></h3>



<p class="wp-block-paragraph">To ensure data persistence during node reboots or pod rescheduling, create a custom values file named <code>prometheus-custom-values.yaml</code> to specify persistent storage, retention duration, and secure authentication credentials:</p>



<pre class="wp-block-code"><code># prometheus-custom-values.yaml
prometheus:
  prometheusSpec:
    retention: 15d
    retentionSize: "40Gi"
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: managed-csi
          accessModes: &#91;"ReadWriteOnce"]
          resources:
            requests:
              storage: 50Gi
    resources:
      requests:
        cpu: "500m"
        memory: "1Gi"
      limits:
        cpu: "2000m"
        memory: "4Gi"

grafana:
  enabled: true
  adminPassword: "DevStackSecureAdmin2026!"
  persistence:
    enabled: true
    storageClassName: managed-csi
    size: 10Gi
  service:
    type: ClusterIP

alertmanager:
  enabled: true
  alertmanagerSpec:
    storage:
      volumeClaimTemplate:
        spec:
          storageClassName: managed-csi
          accessModes: &#91;"ReadWriteOnce"]
          resources:
            requests:
              storage: 10Gi</code></pre>



<h3 class="wp-block-heading">2.3 Execute Helm Deployment</h3>



<p class="wp-block-paragraph">Install the full stack to initialize <strong>Kubernetes Monitoring with Prometheus and Grafana</strong> using your custom values configuration:</p>



<pre class="wp-block-code"><code># Deploy the Helm chart into the monitoring namespace
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values prometheus-custom-values.yaml</code></pre>



<p class="wp-block-paragraph">Verify that all pods, DaemonSets, and storage claims have transitioned into the <code>Running</code> and <code>Bound</code> state:</p>



<pre class="wp-block-code"><code>kubectl get pods,pvc -n monitoring -o wide</code></pre>



<h2 class="wp-block-heading">3. Step 2: Accessing the Grafana Visual Dashboard &amp; Prometheus UI</h2>



<p class="wp-block-paragraph">By default, the services deployed by the Prometheus Operator are assigned internal <code>ClusterIP</code> network definitions. This prevents accidental exposure of cluster metrics to the public internet while securing access through local port forwarding or authenticated internal ingress.</p>



<h3 class="wp-block-heading">3.1 Port-Forwarding Grafana Locally</h3>



<p class="wp-block-paragraph">To securely access the visualization layer for <strong>Kubernetes Monitoring with Prometheus and Grafana</strong> without exposing a public Azure LoadBalancer:</p>



<pre class="wp-block-code"><code># Forward port 3000 from the Grafana service to your local machine
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80</code></pre>



<p class="wp-block-paragraph">Open <code>http://localhost:3000</code> in your browser and enter the administrative credentials:</p>



<ul class="wp-block-list">
<li><strong>Username:</strong> <code>admin</code></li>



<li><strong>Password:</strong> <code>DevStackSecureAdmin2026!</code> <em>(or the custom password defined in your values file)</em></li>
</ul>



<h3 class="wp-block-heading">3.2 Pre-Loaded Enterprise Dashboards</h3>



<p class="wp-block-paragraph">Establishing Kubernetes Monitoring with Prometheus and Grafana automatically loads pre-configured production dashboards into the interface:</p>



<ol start="1" class="wp-block-list">
<li><strong>Kubernetes / Compute Resources / Cluster:</strong> Provides high-level visibility into total cluster CPU cores, RAM consumption, and network saturation.</li>



<li><strong>Kubernetes / Compute Resources / Namespace (Pods):</strong> Pinpoints runaway containers and displays real-time CPU throttling across specific namespaces.</li>



<li><strong>Node Exporter / Use Method / Node:</strong> Delivers deep insights into worker node disk read/write IOPS, memory dirty pages, and socket allocations.</li>
</ol>



<h2 class="wp-block-heading">4. Step 3: Custom Application Metrics for Kubernetes Monitoring with Prometheus and Grafana</h2>



<p class="wp-block-paragraph">Collecting infrastructure metrics is only half the battle. To monitor microservices, Prometheus uses a declarative Custom Resource Definition called <code>ServiceMonitor</code>. A <code>ServiceMonitor</code> tells Prometheus which Kubernetes services to target, which endpoints to scrape, and the polling frequency.</p>



<h3 class="wp-block-heading">4.1 Deploying a Sample Microservice with <code>/metrics</code> Endpoint</h3>



<p class="wp-block-paragraph">Create an application manifest <code>app-deployment.yaml</code> that exposes metrics in Prometheus format:</p>



<pre class="wp-block-code"><code>apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-microservice
  namespace: default
  labels:
    app.kubernetes.io/name: api-microservice
    app.kubernetes.io/part-of: devstack-cloud
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-microservice
  template:
    metadata:
      labels:
        app: api-microservice
    spec:
      containers:
        - name: web-api
          image: &#91;mcr.microsoft.com/oss/nginx/nginx:1.21.6](https://mcr.microsoft.com/oss/nginx/nginx:1.21.6)
          ports:
            - name: http
              containerPort: 80
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: default
  labels:
    app.kubernetes.io/name: api-microservice
spec:
  type: ClusterIP
  ports:
    - name: http
      port: 80
      targetPort: 80
  selector:
    app: api-microservice</code></pre>



<p class="wp-block-paragraph">Apply the deployment:</p>



<pre class="wp-block-code"><code>kubectl apply -f app-deployment.yaml</code></pre>



<h3 class="wp-block-heading">4.2 Creating the <code>ServiceMonitor</code> Custom Resource</h3>



<p class="wp-block-paragraph">Define <code>app-servicemonitor.yaml</code> to configure dynamic scraping:</p>



<pre class="wp-block-code"><code>apiVersion: &#91;monitoring.coreos.com/v1](https://monitoring.coreos.com/v1)
kind: ServiceMonitor
metadata:
  name: api-servicemonitor
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: api-microservice
  namespaceSelector:
    matchNames:
      - default
  endpoints:
    - port: http
      path: /metrics
      interval: 15s
      scrapeTimeout: 10s</code></pre>



<p class="wp-block-paragraph">Apply the <code>ServiceMonitor</code> manifest:</p>



<pre class="wp-block-code"><code>kubectl apply -f app-servicemonitor.yaml</code></pre>



<p class="wp-block-paragraph">The Prometheus Operator watches for resources with the label <code>release: kube-prometheus-stack</code>, automatically reconfiguring the Prometheus targets without requiring a manual service restart.</p>



<h2 class="wp-block-heading">5. Step 4: Configuring Prometheus Alerting Rules (<code>PrometheusRule</code>)</h2>



<p class="wp-block-paragraph">Configuring automated alert rules is an essential phase when implementing Kubernetes Monitoring with Prometheus and Grafana across production clusters. Rather than managing complex flat configuration files, the Prometheus Operator allows teams to declare alert conditions natively using the <code>PrometheusRule</code> Custom Resource.</p>



<p class="wp-block-paragraph">Create a file named <code>cluster-alert-rules.yaml</code>:</p>



<pre class="wp-block-code"><code>apiVersion: &#91;monitoring.coreos.com/v1](https://monitoring.coreos.com/v1)
kind: PrometheusRule
metadata:
  name: devstack-cluster-alerts
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  groups:
    - name: node-and-workload.rules
      rules:
        - alert: KubernetesPodCrashLooping
          expr: increase(kube_pod_container_status_restarts_total&#91;1h]) > 5
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Pod {{ $labels.pod }} is crash looping"
            description: "Pod {{ $labels.pod }} in namespace {{$labels.namespace }} has restarted more than 5 times in the last hour."

        - alert: HighNodeMemorySaturation
          expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.85
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Node memory utilization above 85%"
            description: "Node {{ $labels.instance }} has exceeded 85% memory capacity for over 10 minutes."

        - alert: ContainerCPUThrottlingHigh
          expr: increase(container_cpu_cfs_throttled_periods_total&#91;5m]) / increase(container_cpu_cfs_periods_total&#91;5m]) > 0.25
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Container CPU throttling high for {{ $labels.pod }}"
            description: "Pod {{ $labels.pod }} container {{$labels.container }} is experiencing more than 25% CPU throttling."</code></pre>



<p class="wp-block-paragraph">Apply the alerting manifest:</p>



<pre class="wp-block-code"><code>kubectl apply -f cluster-alert-rules.yaml</code></pre>



<p class="wp-block-paragraph">A complete setup of <strong>Kubernetes Monitoring with Prometheus and Grafana</strong> evaluates these expressions against real-time incoming metrics and automatically dispatches alerts to Alertmanager for downstream routing to Webhooks, Slack channels, or PagerDuty schedules.</p>



<h2 class="wp-block-heading">6. Step 5: Production Hardening, Retention &amp; Scaling Best Practices</h2>



<p class="wp-block-paragraph">Operating <strong>Kubernetes Monitoring with Prometheus and Grafana</strong> at scale requires adherence to enterprise reliability and security principles:</p>



<ul class="wp-block-list">
<li><strong>Implement Remote Storage (Thanos / Cortex):</strong> For retention requirements exceeding 30 days, avoid expanding local PVC storage indefinitely. Integrate Thanos or Azure Managed Prometheus to offload cold time-series chunks directly to cheap Azure Blob Storage.</li>



<li><strong>Tune Metric Scrape Intervals:</strong> High scrape frequencies (e.g., 5s) increase CPU load on worker nodes. Standardize on 15s for critical production services and 30s–60s for batch or background workloads.</li>



<li><strong>Enforce Resource Quotas on Monitoring Namespace:</strong> Prevent monitoring tools from consuming cluster compute during traffic spikes by applying dedicated <code>LimitRanges</code> and <code>ResourceQuotas</code> to the <code>monitoring</code> namespace.</li>



<li><strong>Protect Ingress with Azure Entra ID:</strong> Never expose Grafana directly to the public web with basic authentication. Use OAuth2 Proxy or an Ingress Controller configured with Azure Active Directory (Entra ID) Single Sign-On (SSO).</li>
</ul>



<h2 class="wp-block-heading">Troubleshooting Common Prometheus &amp; Grafana Issues</h2>



<p class="wp-block-paragraph">When maintaining production-grade <strong>Kubernetes Monitoring with Prometheus and Grafana</strong>, resolving misconfigurations quickly prevents data gaps and blind spots.</p>



<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><td><strong>Issue / Symptom</strong></td><td><strong>Root Cause</strong></td><td><strong>Immediate Remediation</strong></td></tr></thead><tbody><tr><td><strong>Prometheus Pod Stuck in <code>Pending</code></strong></td><td>PVC cannot bind due to Azure CSI storage class mismatch</td><td>Verify <code>storageClassName: managed-csi</code> in <code>values.yaml</code> and check <code>kubectl describe pvc -n monitoring</code>.</td></tr><tr><td><strong>Custom Metrics Not Appearing</strong></td><td>Missing matching release label on <code>ServiceMonitor</code></td><td>Ensure <code>labels: release: kube-prometheus-stack</code> is present on your <code>ServiceMonitor</code> metadata.</td></tr><tr><td><strong>Grafana Dashboard Panels Empty</strong></td><td>Prometheus datasource connection timeout or incorrect DNS</td><td>Verify Grafana datasource URL points to <code>http://kube-prometheus-stack-prometheus.monitoring:9090</code>.</td></tr><tr><td><strong>High Memory Usage on Prometheus Pod</strong></td><td>High metric cardinality caused by dynamic label keys (e.g., user IDs)</td><td>Sanitize application metric labels to remove high-cardinality keys before exporting.</td></tr></tbody></table></figure>



<h2 class="wp-block-heading">Conclusion: Mastering Enterprise Kubernetes Observability</h2>



<p class="wp-block-paragraph">Setting up <strong>Kubernetes Monitoring with Prometheus and Grafana</strong> shifts operational strategy from reactive debugging to automated, proactive cluster management.By standardizing on <strong>Kubernetes Monitoring with Prometheus and Grafana</strong>, engineering teams achieve end-to-end cluster observability, minimize production downtime, and scale containerized microservices with complete operational confidence.</p>



<h3 class="wp-block-heading">Related Cloud &amp; DevOps Architecture Guides</h3>



<ul class="wp-block-list">
<li><a href="https://devstackhub.tech/terraform-azure-github-actions-guide/" target="_blank" rel="noreferrer noopener">Terraform Azure Automation: Enterprise Infrastructure as Code with GitHub Actions</a></li>



<li><a href="https://devstackhub.tech/kubernetes-vs-docker-swarm-aks-guide/" target="_blank" rel="noreferrer noopener">Kubernetes vs Docker Swarm: Production AKS Setup, Ingress Routing &amp; Auto-Scaling Guide</a></li>



<li><a href="https://devstackhub.tech/terraform-on-azure-iac-guide/" target="_blank" rel="noreferrer noopener">Terraform on Azure: 5 Complete Steps to Provision Infrastructure</a></li>



<li><a href="https://devstackhub.tech/github-actions-cicd-guide/" target="_blank" rel="noreferrer noopener">GitHub Actions CI/CD: 5 Proven Strategies for Fast Production Workflows</a></li>



<li><a href="https://prometheus-operator.dev/" target="_blank" rel="noreferrer noopener">Official Prometheus Operator Documentation</a></li>
</ul>



<p class="wp-block-paragraph"></p>

