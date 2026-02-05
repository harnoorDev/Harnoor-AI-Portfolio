"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { ExternalLink, Calendar } from "lucide-react";

const articles = [
  {
    title: "Detecting Backdoored LLMs Without Knowing the Trigger",
    subtitle: "A Practical Python Guide",
    description:
      "You're deploying open-source models in production. But how do you know they haven't been poisoned? Here are three practical approaches...",
    date: "Feb 2026",
    url: "https://www.linkedin.com/pulse/detecting-backdoored-llms-without-knowing-trigger-practical-singh-cxxdc",
  },
  {
    title: "Securing LLM Applications Against OWASP Top 10 Risks",
    subtitle: "A Developer's Guide",
    description:
      "The integration of Large Language Models into applications presents unique security challenges. Learn how to mitigate them...",
    date: "Apr 2024",
    url: "https://www.linkedin.com/pulse/developers-guide-securing-llm-applications-against-owasp-singh-35x9c",
  },
  {
    title: "The Power of Generative AI in Fintech and Banking",
    subtitle: "",
    description:
      "The fusion of generative AI, machine learning, and natural language processing is transforming financial services...",
    date: "Mar 2024",
    url: "https://www.linkedin.com/pulse/power-generative-ai-fintech-banking-harnoor-singh-fiurc",
  },
  {
    title: "Tackling Hallucinations in Large Language Models",
    subtitle: "",
    description:
      "In the landscape of AI, LLMs like GPT-3/4 represent a breakthrough. But how do we address their tendency to hallucinate?",
    date: "Jan 2024",
    url: "https://www.linkedin.com/pulse/tackling-challenge-hallucinations-large-language-models-harnoor-singh-v8qbc",
  },
  {
    title: "Mastering Chatbot Creation with MongoDB and LangChain",
    subtitle: "A Magical Journey",
    description:
      "Building intelligent chatbots using modern vector databases and LangChain for seamless conversational AI...",
    date: "Jan 2024",
    url: "https://www.linkedin.com/pulse/mastering-chatbot-creation-mongodb-langchain-magical-journey-singh-yhrec",
  },
];

export default function Articles() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="articles" className="py-32 px-4 relative">
      <div className="max-w-6xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Featured <span className="gradient-text">Articles</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Sharing knowledge on AI security, LLMs, and production engineering
          </p>
        </motion.div>

        <div className="space-y-4">
          {articles.map((article, index) => (
            <motion.a
              key={article.title}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="glass-card p-6 block group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Calendar className="w-4 h-4" />
                    {article.date}
                  </div>
                  <h3 className="text-xl font-semibold mb-1 group-hover:text-cyan-400 transition-colors">
                    {article.title}
                  </h3>
                  {article.subtitle && (
                    <p className="text-cyan-400 text-sm mb-2">{article.subtitle}</p>
                  )}
                  <p className="text-gray-400">{article.description}</p>
                </div>
                <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-cyan-400 transition-colors flex-shrink-0 mt-1" />
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
