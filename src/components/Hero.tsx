"use client";

import { motion } from "framer-motion";
import { ChevronDown, Download, ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center relative px-6 md:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center z-10 max-w-4xl"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8 flex flex-wrap gap-3 justify-center"
        >
          <span className="px-5 py-2.5 rounded-full text-sm font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 backdrop-blur-sm">
            Cloud & AI Engineer 3 @ Symcor
          </span>
          <span className="px-5 py-2.5 rounded-full text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 backdrop-blur-sm">
            AI Red Teamer
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 tracking-tight"
        >
          Hi, I&apos;m{" "}
          <span className="gradient-text">Harnoor Singh</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed"
        >
          Building secure, production-grade enterprise AI solutions.
          <br className="hidden md:block" />
          <span className="text-cyan-400 font-medium">Azure OpenAI • LangChain • GenAI • LLM Security</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex items-center justify-center gap-2 text-gray-500 mb-10"
        >
          <span className="text-lg">📍 Greater Toronto Area, Canada</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <a
            href="#about"
            className="group px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/30 flex items-center gap-2 min-w-[180px] justify-center"
          >
            Learn More
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <a
            href="#contact"
            className="px-8 py-4 border-2 border-cyan-500/30 hover:border-cyan-500 text-cyan-400 font-semibold rounded-xl transition-all duration-300 hover:bg-cyan-500/10 min-w-[180px] justify-center flex items-center"
          >
            Get in Touch
          </a>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="absolute bottom-12"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex flex-col items-center gap-2"
        >
          <span className="text-xs text-gray-600 uppercase tracking-widest">Scroll</span>
          <ChevronDown className="w-6 h-6 text-cyan-400/50" />
        </motion.div>
      </motion.div>
    </section>
  );
}
