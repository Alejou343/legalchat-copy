import { motion } from "framer-motion";

export const ThreeDotLoader = () => {
  return (
    <div className="flex space-x-1 items-center">
      {[0, 1, 2].map((dot) => (
        <motion.div
          key={dot}
          className="h-1.5 w-1.5 bg-zinc-400 rounded-full"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            repeatType: "reverse",
            delay: dot * 0.2,
          }}
        />
      ))}
    </div>
  );
}; 