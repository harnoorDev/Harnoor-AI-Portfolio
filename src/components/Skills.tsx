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
    skills: ["LoRA", "QLoRA", "GPTQ", "AWQ", "GGUF", "INT4/INT8", "TensorRT-LLM", "NVIDIA NIM", "Triton"],
  },
  {
    title: "RAG & Retrieval",
    skills: ["Hybrid Search", "Dense Embeddings", "BM25", "Semantic Chunking", "Cross-Encoder", "HyDE", "pgvector", "Pinecone", "Azure AI Search", "FAISS", "ChromaDB"],
  },
  {
    title: "AI Security",
    skills: ["OWASP LLM Top 10", "MITRE ATLAS", "Prompt Injection", "Jailbreak Testing", "PyRIT", "Garak", "PII Detection", "Guardrails"],
  },
  {
    title: "Cloud & Azure",
    skills: ["Azure AI Services", "Azure Functions", "Cosmos DB", "Sentinel", "Log Analytics", "App Gateway", "Private Endpoints", "Azure WAF", "Azure DevOps"],
  },
  {
    title: "Infrastructure",
    skills: ["Docker", "Kubernetes", "Helm", "Terraform", "ARM Templates", "Jenkins", "CI/CD", "Cloudflare", "VNet"],
  },
  {
    title: "Security",
    skills: ["mTLS", "TLS/SSL", "PKI", "OAuth 2.0", "OpenID Connect", "Azure AD", "Certificate Auth", "WAF Rules"],
  },
  {
    title: "Languages",
    skills: ["Python", "C#", "TypeScript", "Node.js", "PowerShell", ".NET Core", "Next.js", "React", "GraphQL", "REST"],
  },
];

export default function Skills() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="skills" className="py-32 px-6 md:px-8 relative">
      <div className="max-w-7xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Technical <span className="gradient-text">Skills</span>
          </h2>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
            Full-stack AI engineering — from model optimization to production deployment and security
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {skillCategories.map((category, catIndex) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: catIndex * 0.1 }}
              className="glass-card p-6 lg:p-8"
            >
              <h3 className="text-lg font-semibold mb-5 text-cyan-400 tracking-wide">
                {category.title}
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {category.skills.map((skill, skillIndex) => (
                  <motion.span
                    key={skill}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{
                      duration: 0.4,
                      delay: catIndex * 0.1 + skillIndex * 0.02,
                    }}
                    whileHover={{ scale: 1.05 }}
                    className="px-3.5 py-2 text-sm bg-white/5 rounded-lg border border-white/10 hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-all duration-200 cursor-default"
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
