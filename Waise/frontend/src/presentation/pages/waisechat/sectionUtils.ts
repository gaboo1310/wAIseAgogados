interface Page {
  name: string;
  url: string;
  sections: string[];
}


export const getSubsectionsForSection = (page: string, section: string): string[] => {

  if (page === 'H2 News' && section === 'Noticias') {
    return ['Nacional', 'Internacional', 'Tecnología', 'Proyectos', 'Energía Renovable'];
  } else if (page === 'H2 News' && section === 'Estudios') {
    return ['Estrategia de hidrógeno', 'Estudio de reporte'];
  } else if (page === 'Mining' && section === 'Commodities') {
    return ['Iron ORE'];
  } else if (page === 'Mining' && section === 'Regions') {
    return ['China', 'Latin America', 'Europe'];
  } else if (page === 'Mining Digital' && section === 'Sectors') {
    return ['Mining Sites', 'Supplay Chain', 'Smart Mining', 'Sustainability'];
  } else if (page === 'Mining Digital' && section === 'New & Articles') {
    return ['Articles'];
  } else if (page === 'Minería Chilena' && section === 'Actualidad Minera') {
    return ['Comunidades', 'Inversiones'];
  } else if (page === 'Minería Chilena' && section === 'Minería Superficie') {
    return ['Logística', 'Proceso', 'Recursos y reservas', 'Sustentabilidad', 'Tecnología-Innovación'];
  } else if (page === 'Minería Chilena' && section === 'Minería Subterránea') {
    return ['Logística', 'Proceso', 'Recursos y reservas', 'Sustentabilidad', 'Tecnología-Innovación'];
  } else if (page === 'Portal Minero' && section === 'Proyectos') {
    return ['Minería', 'Energía'];
  } else if (page === 'Portal Minero' && section === 'Sala de Prensa') {
    return ['Noticias'];
  } else if (page === 'SEA' && section === 'Energía') {
    return [
      'Interregionales', 'AricaParinacota', 'Tarapacá', 'Antofagasta', 'Atacama',
      'Coquimbo', 'Valparaíso', 'Metropolitana', 'OHiggins', 'Maule', 'Ñuble',
      'Biobio', 'Araucania', 'LosRios', 'LosLagos', 'Aysen', 'MagallanesAntártica'
    ];
  } else if (page === 'SEA' && section === 'Infraestructura portuaria') {
    return [
      'Interregionales', 'AricaParinacota', 'Tarapacá', 'Antofagasta', 'Atacama',
      'Coquimbo', 'Valparaíso', 'Metropolitana', 'OHiggins', 'Maule', 'Ñuble',
      'Biobio', 'Araucania', 'LosRios', 'LosLagos', 'Aysen', 'MagallanesAntártica'
    ];
  } else if (page === 'SEA' && section === 'Infraestructura de transporte') {
    return [
      'Interregionales', 'AricaParinacota', 'Tarapacá', 'Antofagasta', 'Atacama',
      'Coquimbo', 'Valparaíso', 'Metropolitana', 'OHiggins', 'Maule', 'Ñuble',
      'Biobio', 'Araucania', 'LosRios', 'LosLagos', 'Aysen', 'MagallanesAntártica'
    ];
  } else if (page === 'SEA' && section === 'Minería') {
    return [
      'Interregionales', 'AricaParinacota', 'Tarapacá', 'Antofagasta', 'Atacama',
      'Coquimbo', 'Valparaíso', 'Metropolitana', 'OHiggins', 'Maule', 'Ñuble',
      'Biobio', 'Araucania', 'LosRios', 'LosLagos', 'Aysen', 'MagallanesAntártica'
    ];
  } else if (page === 'Revista digital minera' && section === 'Otros temas') {
    return ['Litio', 'Exploración Minera'];
  }

  // Agrega más lógica según sea necesario
  return [];
};

export const preloadedPages: Page[] = [
  { name: "BN Americas", url: "https://www.bnamericas.com/es", sections: ["Noticias", "Proyectos"] },
  { name: "Energías Renovables", url: "https://pagina2.com", sections: ["Bioenergía", "Eólica", "Hidrógeno", "Panoramas", "Solar"] },
  { name: "H2 News", url: "https://pagina3.com", sections: ["Noticias", "Estudios"] },
  { name: "Mining", url: "https://pagina4.com", sections: ["Copper", "Gold", "Lithium", "Commodities", "Usa", "Regions"] },
  { name: "Mining Digital", url: "https://pagina5.com", sections: ["Sectors", "New & Articles"] },
  { name: "Minería Chilena", url: "https://pagina6.com", sections: ["Actualidad Minera", "Minería Superficie", "Minería Subterránea", "Proveedores"] },
  { name: "NME", url: "https://pagina7.com", sections: ["Minería", "Energía", "Internacional", "Industria"] },
  { name: "Periódico de la energía", url: "https://pagina8.com", sections: ["Política Energética", "Renovables", "Mercados", "Eléctricas", "Petróleo y Gas", "Hidrógeno", "Latam"] },
  { name: "Portal Minero", url: "https://pagina9.com", sections: ["Proyectos", "Sala de Prensa"] },
  { name: "Reporte minero y energético", url: "https://pagina10.com", sections: ["Noticias", "Minería Sustentable", "Energías Limpias", "Reportajes"] },
  { name: "Revista digital minera", url: "https://pagina11.com", sections: ["Minería", "Internacional", "Energía", "Commodities", "Otros temas"] },
  { name: "SEA", url: "https://pagina12.com", sections: ["Energía", "Infraestructura portuaria", "Infraestructura de transporte", "Minería"] },
];