export async function onRequestPost(context) {
  try {
    const { message } = await context.request.json();

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message payload required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are the DevStackHub Architecture Terminal Assistant. 
You assist cloud architects, DevOps engineers, and developers with technical guides, commands, and infrastructure playbooks published on DevStackHub (devstackhub.tech).

Key Platform Topics & Articles:
- Docker Container Optimization & Multi-stage builds: Use path [/docker-containers-production-guide/]
- Terraform on Azure Infrastructure as Code: Use path [/terraform-on-azure-iac-guide/]
- Kubernetes vs Docker Swarm & AKS Setup: Use path [/kubernetes-vs-docker-swarm-aks-guide/]
- Azure App Service Deployment & SSL: Use path [/azure-app-service-deploy-guide/]
- GitHub Actions CI/CD Automation: Use path [/github-actions-cicd-guide/]

Response Rules:
- Keep answers direct, concise, and terminal-styled.
- Use markdown backticks for code and terminal commands.
- Whenever you discuss a topic covered on DevStackHub, you MUST include a direct clickable markdown link pointing to its guide path (e.g. [Read the full Docker Guide](/docker-containers-production-guide/)).`;

    const ai = context.env.AI;
    if (!ai) {
      return new Response(JSON.stringify({ error: 'Workers AI binding not detected' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = await ai.run('@cf/meta/llama-3.2-3b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message.slice(0, 500) }
      ],
      max_tokens: 800, // Increased to prevent response cut-off
      temperature: 0.3
    });

    return new Response(JSON.stringify({ response: response.response }), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Edge inference failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}