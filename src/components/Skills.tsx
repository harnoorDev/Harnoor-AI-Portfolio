"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const skillCategories = [
  {
    title: "Languages",
    skills: ["Python", "TypeScript", "JavaScript", "Java", "C#", "SQL"],
  },
  {
    title: "AI & ML",
    skills: ["LangChain", "OpenAI", "PyTorch", "TensorFlow", "Hugging Face", "RAG"],
  },
  {
    title: "Cloud & DevOps",
    skills: ["Azure", "AWS", "Docker", "Kubernetes", "Terraform", "CI/CD"],
  },
  {
    title: "Frameworks",
    skills: ["Next.js", "React", "Node.js", ".NET", "Spring Boot", "FastAPI"],
  },
  {
    title: "Databases",
    skills: ["PostgreSQL", "MongoDB", "Redis", "Azure SQL", "Vector DBs", "Pinecone"],
  },
  {
    title: "Security",
    skills: ["OWASP", "OAuth/OIDC", "Azure AD", "Prompt Injection", "LLM Security", "CCNA"],
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
            A comprehensive toolkit for building modern AI-powered applications
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      delay: catIndex * 0.1 + skillIndex * 0.05,
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
