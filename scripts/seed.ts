import { db, sqlite } from '../src/db';
import { siteSettings } from '../src/db/schema';
import { tables } from '../src/lib/repository';
import type { Collection } from '../src/lib/content-config';
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true')
  throw new Error(
    'Seeding is disabled in production. Set ALLOW_DEMO_SEED=true explicitly for initial setup only.',
  );
// Starting content for PT Genesis Trans Indonesia, taken from the company brief.
// Details the company has not confirmed yet (phone, WhatsApp, address, year established,
// clients, projects) are left blank; the website marks them as "to be updated".
db.transaction((tx) => {
  tx.insert(siteSettings)
    .values({
      id: 1,
      companyName: 'Genesis Trans Indonesia',
      legalName: 'PT Genesis Trans Indonesia',
      tagline: 'Your Trusted Partner in Logistics & Transportation',
      shortDescription:
        'Angkutan kontainer 20 dan 40 feet dari pabrik atau gudang ke Pelabuhan Tanjung Priok, lengkap dengan bantuan pengurusan kepabeanan.',
      shortDescriptionEn:
        'Trucking for 20 and 40-foot containers from your factory or warehouse to Tanjung Priok Port, with customs clearance assistance.',
      about:
        'PT Genesis Trans Indonesia merupakan perusahaan yang bergerak di bidang jasa transportasi barang dan logistik, dengan fokus pada layanan pengangkutan menggunakan kontainer berkapasitas 20 feet dan 40 feet.\n\nKami melayani kebutuhan pengiriman barang dari pabrik maupun gudang menuju pelabuhan, khususnya Pelabuhan Tanjung Priok, Jakarta. Selain layanan transportasi, kami juga membantu pelanggan dalam proses pengurusan kepabeanan (customs clearance) untuk mendukung kelancaran aktivitas pengiriman dan ekspor-impor.\n\nDengan mengutamakan profesionalisme, efisiensi, dan kepercayaan, PT Genesis Trans Indonesia berkomitmen menjadi mitra logistik yang dapat diandalkan bagi kebutuhan bisnis dan industri.',
      aboutEn:
        'PT Genesis Trans Indonesia is a freight transportation and logistics company focused on haulage using 20-foot and 40-foot containers.\n\nWe move goods from factories and warehouses to the port, in particular Tanjung Priok Port in Jakarta. Alongside transportation, we assist customers with customs clearance to keep shipping and export-import activity running smoothly.\n\nBy putting professionalism, efficiency and trust first, PT Genesis Trans Indonesia is committed to being a logistics partner that businesses and industry can rely on.',
      vision:
        'Menjadi perusahaan jasa transportasi dan logistik yang terpercaya, profesional, dan kompetitif dalam mendukung kelancaran distribusi serta kebutuhan pengiriman barang di Indonesia.',
      visionEn:
        'To be a trusted, professional and competitive transportation and logistics company that supports smooth distribution and freight delivery across Indonesia.',
      mission:
        'Menyediakan layanan transportasi dan logistik yang aman, efisien, dan tepat waktu.\nMemberikan kemudahan kepada pelanggan dalam proses pengiriman dan pengurusan kepabeanan (customs clearance).\nMembangun hubungan kerja sama jangka panjang melalui pelayanan profesional dan terpercaya.\nTerus meningkatkan kualitas operasional dan jaringan layanan logistik.',
      missionEn:
        'Provide safe, efficient and on-time transportation and logistics services.\nMake shipping and customs clearance easier for our customers.\nBuild long-term partnerships through professional and trustworthy service.\nKeep improving our operational quality and logistics service network.',
      established: '',
      phone: '',
      whatsapp: '',
      email: 'info@genesistransindo.com',
      address: '',
      mapsUrl: '',
      instagram: '',
      linkedin: '',
      ctaText: 'Minta penawaran',
      ctaTextEn: 'Request a quote',
      logo: '/images/genesis/logo.webp',
      favicon: '/images/genesis/favicon.png',
      credentials: '',
      statistics: [],
      demoMode: false,
    })
    .onConflictDoNothing()
    .run();
  const data: Record<
    Collection,
    { title: string; slug: string; description: string; [key: string]: unknown }[]
  > = {
    services: [
      {
        title: 'Angkutan Kontainer',
        titleEn: 'Container Transportation',
        slug: 'container-transportation',
        shortDescription: 'Pengangkutan barang dengan kontainer 20 feet dan 40 feet.',
        shortDescriptionEn: 'Freight haulage in 20-foot and 40-foot containers.',
        description:
          'Layanan pengangkutan barang menggunakan kontainer 20 feet dan 40 feet untuk memenuhi kebutuhan distribusi dan pengiriman pelanggan.',
        descriptionEn:
          'Freight haulage using 20-foot and 40-foot containers to meet our customers’ distribution and shipping needs.',
        image: '/images/genesis/service-container-1280.webp',
      },
      {
        title: 'Trucking Domestik',
        titleEn: 'Domestic Trucking',
        slug: 'domestic-trucking',
        shortDescription: 'Transportasi darat dari pabrik atau gudang ke lokasi tujuan.',
        shortDescriptionEn: 'Road transport from your factory or warehouse to the destination.',
        description:
          'Jasa transportasi darat untuk mengangkut barang dari lokasi pabrik, gudang, maupun tempat penyimpanan menuju lokasi tujuan.',
        descriptionEn:
          'Road transport that carries goods from factories, warehouses and storage sites to their destination.',
        image: '/images/genesis/service-trucking-1280.webp',
      },
      {
        title: 'Angkutan Pabrik ke Pelabuhan',
        titleEn: 'Factory-to-Port Transportation',
        slug: 'factory-to-port-transportation',
        shortDescription: 'Dari pabrik atau gudang langsung ke Pelabuhan Tanjung Priok.',
        shortDescriptionEn: 'Straight from your factory or warehouse to Tanjung Priok Port.',
        description:
          'Layanan pengangkutan barang dari pabrik atau gudang langsung menuju Pelabuhan Tanjung Priok untuk kebutuhan pengiriman domestik maupun ekspor.',
        descriptionEn:
          'Haulage from your factory or warehouse directly to Tanjung Priok Port, for domestic shipping and export.',
        image: '/images/genesis/service-factory-port-640.webp',
      },
      {
        title: 'Bantuan Customs Clearance',
        titleEn: 'Customs Clearance Assistance',
        slug: 'customs-clearance-assistance',
        shortDescription: 'Bantuan pengurusan dokumen dan proses kepabeanan.',
        shortDescriptionEn: 'Help with customs documents and the clearance process.',
        description:
          'Bantuan pengurusan dokumen dan proses kepabeanan untuk mendukung kelancaran aktivitas ekspor dan impor.',
        descriptionEn:
          'Assistance with documents and the customs process to keep your export and import activity moving.',
        image: '/images/genesis/service-customs-1280.webp',
      },
      {
        title: 'Koordinasi Logistik & Pengiriman',
        titleEn: 'Logistics & Shipping Coordination',
        slug: 'logistics-shipping-coordination',
        shortDescription: 'Transportasi dan pengiriman diatur dalam satu koordinasi.',
        shortDescriptionEn: 'Transport and shipping arranged through one point of coordination.',
        description:
          'Koordinasi kebutuhan transportasi dan proses pengiriman barang agar berjalan lebih efisien dan terorganisir.',
        descriptionEn:
          'Coordination of transport needs and the shipping process so that deliveries run efficiently and stay organised.',
        image: '/images/genesis/service-coordination-1280.webp',
      },
    ],
    // No project, client or article records were supplied yet.
    projects: [],
    clients: [],
    articles: [],
  };
  for (const [name, records] of Object.entries(data))
    records.forEach((r, i) =>
      tx
        .insert(tables[name as Collection])
        .values({ ...r, published: true, sortOrder: i })
        .onConflictDoNothing()
        .run(),
    );
});
console.log('Initial content seeded without overwriting existing records.');
sqlite.close();
