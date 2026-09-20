import { db, sqlite } from '../src/db';
import { siteSettings } from '../src/db/schema';
import { tables } from '../src/lib/repository';
import type { Collection } from '../src/lib/content-config';
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true')
  throw new Error(
    'Demo seeding is disabled in production. Set ALLOW_DEMO_SEED=true explicitly for initial setup only.',
  );
db.transaction((tx) => {
  tx.insert(siteSettings)
    .values({
      id: 1,
      companyName: 'LINTAS',
      legalName: 'PT Lintas Nusa Logistik (Demo)',
      tagline: 'Menghubungkan bisnis. Menggerakkan Indonesia.',
      shortDescription:
        'Solusi angkutan darat untuk setiap kebutuhan bisnis. Dari muatan pertama hingga tujuan terakhir, kami membantu merencanakan pengiriman Anda.',
      about:
        'Lintas Nusa Logistik adalah identitas perusahaan contoh untuk layanan transportasi darat di Indonesia. Kami mengutamakan perencanaan rute, pemilihan armada yang tepat, serta komunikasi yang jelas di setiap tahap pengiriman. Profil ini dapat disesuaikan dengan sejarah, pengalaman, dan kemampuan operasional perusahaan Anda.',
      vision:
        'Menjadi mitra transportasi darat yang dapat diandalkan untuk menghubungkan bisnis di seluruh Indonesia.',
      mission:
        'Merencanakan pengiriman sesuai karakter muatan dan kebutuhan pelanggan.\nMengutamakan keselamatan, perawatan kendaraan, dan komunikasi yang terbuka.\nMembangun kerja sama jangka panjang melalui layanan yang bertanggung jawab.',
      established: '2014',
      phone: '+62 21 5550 0100',
      whatsapp: '622155500100',
      email: 'hello@lintas.example',
      address:
        'Jl. Raya Industri No. 18, Bekasi, Jawa Barat\nAlamat contoh — ganti sebelum publikasi.',
      mapsUrl: '',
      instagram: '',
      linkedin: '',
      ctaText: 'Minta Penawaran',
      logo: '',
      favicon: '',
      credentials:
        'Dokumen legal dan sertifikasi akan ditampilkan setelah diverifikasi oleh perusahaan.',
      statistics: [
        { value: '06', label: 'Pilihan layanan' },
        { value: '03', label: 'Kategori armada' },
        { value: '08', label: 'Area contoh' },
        { value: '01', label: 'Mitra untuk perjalanan Anda' },
      ],
      demoMode: true,
    })
    .onConflictDoNothing()
    .run();
  const data: Record<
    Collection,
    { title: string; slug: string; description: string; [key: string]: unknown }[]
  > = {
    services: [
      {
        title: 'Full Truck Load',
        slug: 'full-truck-load',
        shortDescription: 'Satu armada khusus untuk muatan bisnis Anda.',
        description:
          'Pengiriman dengan satu kendaraan khusus dari titik muat ke tujuan. Cocok untuk kebutuhan distribusi dengan volume besar dan jadwal yang terencana.',
        image: '/images/fleet.jpg',
        icon: 'Truck',
      },
      {
        title: 'Distribusi Antarkota',
        slug: 'distribusi-antarkota',
        shortDescription: 'Menghubungkan gudang, pabrik, dan jaringan distribusi.',
        description:
          'Perencanaan angkutan antarkota dengan pilihan kendaraan sesuai kapasitas, akses lokasi, serta karakter barang. Jadwal dan rute dikonfirmasi saat penawaran.',
        image: '/images/hero.jpg',
        icon: 'Route',
      },
      {
        title: 'Angkutan Kontainer',
        slug: 'angkutan-kontainer',
        shortDescription: 'Koneksi darat dari pelabuhan ke bisnis Anda.',
        description:
          'Layanan trucking untuk kebutuhan kontainer dari dan menuju area pelabuhan. Informasikan ukuran kontainer serta persyaratan operasional Anda.',
        image: '/images/port.jpg',
        icon: 'Container',
      },
      {
        title: 'Distribusi Retail',
        slug: 'distribusi-retail',
        shortDescription: 'Pengiriman terencana ke titik distribusi Anda.',
        description:
          'Pengaturan pengiriman barang retail berdasarkan titik tujuan, jadwal penerimaan, dan kebutuhan penanganan muatan.',
        image: '/images/fleet.jpg',
        icon: 'Package',
      },
      {
        title: 'Angkutan Industri',
        slug: 'angkutan-industri',
        shortDescription: 'Dukungan transportasi bahan baku dan hasil produksi.',
        description:
          'Diskusikan dimensi, berat, dan persyaratan penanganan barang industri Anda untuk menentukan armada dan rencana pengiriman yang sesuai.',
        image: '/images/port.jpg',
        icon: 'Warehouse',
      },
      {
        title: 'Dedicated Transport',
        slug: 'dedicated-transport',
        shortDescription: 'Rencana transportasi untuk kebutuhan rutin.',
        description:
          'Kerja sama transportasi berkala yang disusun berdasarkan kebutuhan distribusi perusahaan, dengan cakupan dan jadwal yang disepakati bersama.',
        image: '/images/hero.jpg',
        icon: 'Handshake',
      },
    ],
    fleet: [
      {
        title: 'Colt Diesel Double',
        slug: 'colt-diesel-double',
        vehicleType: 'CDD / Light duty',
        capacity: '4–5 ton',
        shortDescription: 'Lincah untuk distribusi perkotaan.',
        description:
          'Pilihan kendaraan untuk pengiriman retail dan muatan umum dengan akses jalan perkotaan.',
        specifications:
          'Karoseri: box atau bak\nMuatan: barang umum\nKapasitas final mengikuti dimensi dan batas legal.',
        image: '/images/fleet.jpg',
      },
      {
        title: 'Wingbox',
        slug: 'wingbox',
        vehicleType: 'Heavy duty',
        capacity: '15–20 ton',
        shortDescription: 'Akses muat lebih fleksibel.',
        description:
          'Bukaan samping mendukung proses muat dan bongkar dengan forklift untuk kebutuhan distribusi industri.',
        specifications:
          'Akses: sisi samping dan belakang\nMuatan: barang palet\nKetersediaan dikonfirmasi saat penawaran.',
        image: '/images/hero.jpg',
      },
      {
        title: 'Trailer Kontainer',
        slug: 'trailer-kontainer',
        vehicleType: 'Container transport',
        capacity: '20 / 40 feet',
        shortDescription: 'Dari pelabuhan menuju tujuan.',
        description:
          'Pilihan transportasi kontainer untuk koneksi pelabuhan, kawasan industri, dan gudang.',
        specifications:
          'Ukuran: 20 atau 40 feet\nMuatan: sesuai spesifikasi kontainer\nBerat mengikuti batas legal kendaraan dan rute.',
        image: '/images/port.jpg',
      },
    ],
    coverage: [
      'Jakarta|DKI Jakarta|-6.2|106.8',
      'Bekasi|Jawa Barat|-6.24|106.99',
      'Bandung|Jawa Barat|-6.91|107.61',
      'Semarang|Jawa Tengah|-6.97|110.42',
      'Surabaya|Jawa Timur|-7.25|112.75',
      'Yogyakarta|DI Yogyakarta|-7.8|110.36',
      'Tangerang|Banten|-6.18|106.63',
      'Denpasar|Bali|-8.65|115.22',
    ].map((v) => {
      const [title, province, lat, lng] = v.split('|');
      return {
        title,
        slug: title.toLowerCase(),
        province,
        latitude: Number(lat),
        longitude: Number(lng),
        description:
          'Area layanan contoh. Konfirmasikan cakupan dan jadwal untuk lokasi pengiriman Anda.',
      };
    }),
    projects: [
      {
        title: 'Menjaga ritme distribusi industri',
        slug: 'distribusi-industri',
        clientName: 'Perusahaan manufaktur (ilustrasi)',
        projectYear: '2025',
        shortDescription: 'Distribusi bahan baku • Jawa Barat',
        description:
          'Skenario proyek contoh: perencanaan pengiriman bahan baku dari gudang pemasok ke kawasan industri, dengan penyesuaian jadwal penerimaan dan jenis kendaraan.',
        image: '/images/fleet.jpg',
      },
      {
        title: 'Koneksi pelabuhan ke gudang',
        slug: 'pelabuhan-ke-gudang',
        clientName: 'Perusahaan perdagangan (ilustrasi)',
        projectYear: '2025',
        shortDescription: 'Angkutan kontainer • Jakarta',
        description:
          'Skenario proyek contoh: transportasi kontainer dari pelabuhan ke gudang distribusi dengan koordinasi titik muat dan bongkar. Bukan klaim hubungan klien atau proyek nyata.',
        image: '/images/port.jpg',
      },
    ],
    clients: ['NUSA INDUSTRI', 'ARUNA TRADE', 'PRIMA RETAIL', 'BUMI MATERIAL'].map((title, i) => ({
      title,
      slug: title.toLowerCase().replaceAll(' ', '-'),
      description: 'Identitas klien fiktif untuk demonstrasi.',
      image: `/images/client-${i + 1}.svg`,
      website: '',
    })),
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
console.log('Demo content seeded without overwriting existing records.');
sqlite.close();
