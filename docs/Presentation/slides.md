---
theme: default
background: https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072
class: text-center
highlighter: shiki
lineNumbers: false
info: |
  ## CloudAppDev - Milestone 3
  Production-Grade SaaS
drawings:
  persist: false
transition: slide-left
title: CloudAppDev - Milestone 3
mdc: true
---

# CloudAppDev - Milestone 3
## Production-Grade SaaS

<div class="absolute bottom-10 left-10 text-sm opacity-75">
  <div>Simon Driescher, Samuel Behrmann, Simon Blaser</div>
</div>

---

# From M2 to M3

<div class="grid grid-cols-3 gap-4 mt-8 text-left text-sm">

<div class="bg-[#13121b] border border-[#2a2837] rounded-lg p-4 text-slate-200/80">
  <div class="text-base font-semibold mb-1">M1: Monolith</div>
  <ul class="space-y-1 leading-relaxed">
    <li>Cloud Run</li>
    <li>Single instance</li>
  </ul>
</div>

<div class="bg-[#13121b] border border-[#2a2837] rounded-lg p-4 text-slate-200/80">
  <div class="text-base font-semibold mb-1">M2: Microservices</div>
  <ul class="space-y-1 leading-relaxed">
    <li>GKE + 5 services</li>
    <li>Shared infrastructure</li>
  </ul>
</div>

<div class="bg-[#1f1d2e] border-2 border-[#c4a7e7] rounded-lg p-5 shadow-[0_10px_40px_rgba(196,167,231,0.2)]">
  <div class="text-base font-semibold text-[#c4a7e7] mb-1">M3: SaaS</div>
  <ul class="space-y-1 leading-relaxed">
    <li>Multi-Tenancy</li>
    <li>Auto-Provisioning</li>
    <li>Financial Model</li>
    <li>Infrastructure</li>
  </ul>
</div>

</div>

<div v-click class="grid grid-cols-3 gap-4 mt-8">

<div style="background-color: #1f1d2e; border: 2px solid #f6c177; padding: 1rem; border-radius: 0.5rem;">
<div style="color: #f6c177; font-weight: bold; margin-bottom: 0.5rem;">FREE</div>
<div style="font-size: 0.8em; color: #908caa;">
Shared namespace<br/>
3 routes, 500MB storage<br/>
Best Effort<br/>
€0/month
</div>
</div>

<div style="background-color: #1f1d2e; border: 2px solid #9ccfd8; padding: 1rem; border-radius: 0.5rem;">
<div style="color: #9ccfd8; font-weight: bold; margin-bottom: 0.5rem;">STANDARD</div>
<div style="font-size: 0.8em; color: #908caa;">
Shared namespace<br/>
Higher priority support<br/>
99.5% SLA<br/>
€9,99/month + usage
</div>
</div>

<div style="background-color: #1f1d2e; border: 2px solid #eb6f92; padding: 1rem; border-radius: 0.5rem;">
<div style="color: #eb6f92; font-weight: bold; margin-bottom: 0.5rem;">ENTERPRISE</div>
<div style="font-size: 0.8em; color: #908caa;">
Dedicated namespace<br/>
Dedicated infrastructure<br/>
99.99% SLA<br/>
€249+/month custom
</div>
</div>

</div>

---
background: '#ffffff'
---

# Registration & Provisioning Flow

<div class="flex justify-center items-center h-full">
  <div style="background-color: #ffffff; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 10px 40px rgba(0,0,0,0.35);">
    <img src="./registration.drawio.svg" alt="Registration and Provisioning Flow" class="max-h-[75vh] w-auto" />
  </div>
</div>

---

# New Services (M3)

<div style="margin-top: 3rem; display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">

<div style="background-color: #1f1d2e; border-left: 4px solid #c4a7e7; padding: 1.5rem; border-radius: 0.25rem;">

**Tenant Service** (8084)
- Registration & login
- Namespace validation
- JWT auth (bcrypt)
- Manage tenant metadata

Stack: NestJS + PostgreSQL

</div>

<div style="background-color: #1f1d2e; border-left: 4px solid #f6c177; padding: 1.5rem; border-radius: 0.25rem;">

**Provisioning Service**
- Infrastructure orchestration
- Terraform runner
- K8s namespace deployer
- Domain + SSL provisioning

Stack: NestJS + Terraform + K8s

</div>

</div>



---

<div class="flex justify-center items-center h-full flex-col gap-4">
  <a href="https://raw.githubusercontent.com/CloudAppDevProject/CloudAppDev/develop/docs/microservice_architecture.drawio.svg" target="_blank" rel="noopener noreferrer" class="text-sm text-[#9ccfd8] hover:text-[#c4a7e7] transition-colors">Ref
  </a>
</div>



---

# Dataflow Infrastructure

<div class="flex justify-center items-center h-full flex-col gap-4">
  <a href="https://raw.githubusercontent.com/CloudAppDevProject/CloudAppDev/develop/docs/dataflow_diagram.drawio.svg" target="_blank" rel="noopener noreferrer">
    <div style="background-color: #ffffff; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 10px 40px rgba(0,0,0,0.35);">
      <img src="https://raw.githubusercontent.com/CloudAppDevProject/CloudAppDev/develop/docs/dataflow_diagram.drawio.svg" alt="Data Flow Diagram" class="max-h-[60vh] w-160 cursor-pointer hover:opacity-80 transition-opacity" />
    </div>
  </a>
</div>

---

# Thank You!

**CloudAppDev Milestone 3**

<div class="mt-12 text-sm opacity-75">
Production-Grade SaaS | Multi-Tenancy | Continuous Delivery<br/>
Automated Provisioning | Financial Analytics | Enterprise Security<br/>
NestJS + Prisma | PostgreSQL 16 + MongoDB | Google Kubernetes Engine
</div>
