import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

export const Overview = () => {
  return (
    <motion.div
      key="overview"
      className="max-w-3xl mx-auto md:mt-20"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="rounded-xl p-6 flex flex-col gap-8 leading-relaxed text-center max-w-xl">
        <div className="flex justify-center">
          <Image
            src="/images/logo.png"
            alt="Exterior Concept Logo"
            width={128}
            height={128}
            className="object-contain"
          />
        </div>
        <p>
        ¡Hola! Soy el Agente de Ventas Inteligente de Exterior Concept, especializado en generar cotizaciones.
        <br />
        Puedes comenzar proporcionando información del cliente o solicitando una cotización para productos específicos. El asistente te guiará durante todo el proceso. 
        </p>
      </div>
    </motion.div>
  );
};
