"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const skillCategories = [
  {
    title: "Languages",
    skills: ["Python", "C#", "TypeScript", "JavaScript", "Java", "C++", "Kotlin", "SQL", "PowerShell"],
  },
  {
    title: "AI & ML",
    skills: ["LangChain", "OpenAI", "PyTorch", "TensorFlow", "Hugging Face", "RAG", "Vector DBs", "LLM Security"],
  },
  {
    title: "Cloud Platforms",
    skills: ["Microsoft Azure", "AWS", "Azure Functions", "App Service", "Azure AD", "Azure Sentinel", "Log Analytics"],
  },
  {
    title: "DevOps & Infra",
    skills: ["Docker", "Kubernetes", "Terraform", "CI/CD", "GitHub Actions", "Azure DevOps", "Infrastructure as Code"],
  },
  {
    title: "Frameworks",
    skills: [".NET Core", "ASP.NET MVC", "Node.js", "Next.js", "React", "Spring Boot", "FastAPI", "Express.js"],
  },
  {
    title: "Databases",
    skills: ["Azure SQL", "PostgreSQL", "MongoDB", "Redis", "Pinecone", "CosmosDB", "SQL Server"],
  },
  {
    title: "Security",
    skills: ["OWASP Top 10", "OAuth 2.0", "OpenID Connect", "Azure AD Auth", "LLM Security", "Prompt Injection Defense"],
  },
  {
    title: "Certifications",
    skills: ["Microsoft Azure (4x)", "CCNA (Cisco)", "CompTIA", "Oracle"],
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
            A comprehensive toolkit for building modern cloud infrastructure and AI-powered applications
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
                      delay: catIndex * 0.1 + skillIndex * 0.03,
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
