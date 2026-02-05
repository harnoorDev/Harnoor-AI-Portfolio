"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const skillCategories = [
  {
    title: "LLM & GenAI",
    skills: ["Azure OpenAI", "LangChain", "LangGraph", "LangSmith", "Semantic Kernel", "AutoGen", "CrewAI", "Hugging Face", "vLLM", "Ollama"],
  },
  {
    title: "Model Optimization",
    skills: ["LoRA", "QLoRA", "GPTQ", "AWQ", "GGUF", "INT4/INT8 Quantization", "TensorRT-LLM", "NVIDIA NIM", "Triton Inference Server"],
  },
  {
    title: "RAG & Retrieval",
    skills: ["Hybrid Search", "Dense Embeddings", "BM25", "Semantic Chunking", "Cross-Encoder Reranking", "HyDE", "Multi-Query Expansion", "pgvector", "Pinecone", "Azure AI Search", "FAISS", "ChromaDB"],
  },
  {
    title: "AI Security & Red Teaming",
    skills: ["OWASP LLM Top 10", "MITRE ATLAS", "Prompt Injection", "Jailbreak Testing", "PyRIT", "Garak", "PII Detection", "Guardrails", "Content Filtering"],
  },
  {
    title: "Cloud & Azure",
    skills: ["Azure AI Services", "Azure Functions", "Cosmos DB", "Sentinel", "Log Analytics", "App Gateway", "Private Endpoints", "VNet", "Azure WAF", "Azure DevOps"],
  },
  {
    title: "Infrastructure & DevOps",
    skills: ["Docker", "Kubernetes", "Helm", "Terraform", "ARM Templates", "Jenkins", "CI/CD", "Cloudflare", "REST APIs", "GraphQL"],
  },
  {
    title: "Security & Protocols",
    skills: ["mTLS", "TLS/SSL", "PKI", "OAuth 2.0", "OpenID Connect", "Azure AD", "Certificate Auth", "WAF Rules", "OWASP"],
  },
  {
    title: "Languages & Frameworks",
    skills: ["Python", "C#", "TypeScript", "Node.js", "PowerShell", ".NET Core", "Next.js", "React", "Pandas"],
  },
];

export default function Skills() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="skills" className="py-32 px-4 relative">
      <div className="max-w-6xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Technical <span className="gradient-text">Skills</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Full-stack AI engineering — from model optimization to production deployment and security
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {skillCategories.map((category, catIndex) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: catIndex * 0.1 }}
              className="glass-card p-6"
            >
              <h3 className="text-lg font-semibold mb-4 text-cyan-400">
                {category.title}
              </h3>
              <div className="flex flex-wrap gap-2">
                {category.skills.map((skill, skillIndex) => (
                  <motion.span
                    key={skill}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{
                      duration: 0.4,
                      delay: catIndex * 0.1 + skillIndex * 0.02,
                    }}
                    whileHover={{ scale: 1.05, backgroundColor: "rgba(0, 212, 255, 0.2)" }}
                    className="px-3 py-1.5 text-sm bg-white/5 rounded-lg border border-white/10 hover:border-cyan-500/30 transition-colors cursor-default"
                  >
                    {skill}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
