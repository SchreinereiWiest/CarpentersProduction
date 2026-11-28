import prisma from "../../infrastructure/database/prisma.js";

const customerOrderBy = [
    { lastName: "asc" },
    { firstName: "asc" }
];

const customerListInclude = {
    addresses: {
        where: { deletedAt: null }
    }
};

export const getCustomerDisplayStatus = (projects = []) => {
    const existingProjects = projects.filter(project => !project.deletedAt);

    return existingProjects.length > 0
        && existingProjects.every(project => project.status === "archive")
        ? "inactive"
        : "active";
};

export const createCustomerDisplayStatusWhere = status => {
    if (status === "inactive") {
        return {
            projects: {
                some: { deletedAt: null },
                none: {
                    deletedAt: null,
                    status: { not: "archive" }
                }
            }
        };
    }

    return {
        OR: [
            { projects: { none: { deletedAt: null } } },
            {
                projects: {
                    some: {
                        deletedAt: null,
                        status: { not: "archive" }
                    }
                }
            }
        ]
    };
};

// Api endpoint für alle Kunden felder

export const newcustomer = async (req, res) => {

    try {

        console.log(req.body);

        if (!req.body.firstName || !req.body.lastName) {
            return res.status(400).json({
                error: "Vorname und Nachname sind erforderlich"
            });
        }
        
        const customer = await prisma.customer.create({

            data: {

                // Die Mandantenzuordnung kommt ausschließlich aus der
                // authentifizierten Sitzung, niemals aus dem Request-Body.
                tenantId: req.tenant.id,

                firstName: req.body.firstName,
                lastName: req.body.lastName,
                companyName: req.body.companyName,
                email: req.body.email,
                phoneMobile: req.body.phoneMobile,
                phoneLandline: req.body.phoneLandline,
                preferredContact: req.body.preferredContact,
                newsletterOptIn: req.body.newsletterOptIn,
                customerStatus: "active",
                customerRating: req.body.customerRating,
                source: req.body.source,
                notes: req.body.notes,

                addresses: {
                    create: {
                        // Verschachtelte Prisma-Creates durchlaufen den
                        // Tenant-Proxy nicht als eigene Operation.
                        tenantId: req.tenant.id,
                        street: req.body.street,
                        houseNumber: req.body.houseNumber,
                        postalCode: req.body.postalCode,
                        city: req.body.city,
                        country: req.body.country,
                        floor: req.body.floor,
                        elevatorAvailable: req.body.elevatorAvailable,
                        parkingInfo: req.body.parkingInfo

                    },
                },
            }, include: {
                addresses: true
            }
        });

        return res.status(201).json(customer);


    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }

}

const importText = (value, maxLength = 500) => {
    const text = String(value ?? "").trim();
    return text ? text.slice(0, maxLength) : null;
};

const normalizeImportedCustomer = (row, index) => {
    const firstName = importText(row?.firstName, 100);
    const lastName = importText(row?.lastName, 100);
    const companyName = importText(row?.companyName, 200);
    if (!firstName && !lastName && !companyName) {
        const error = new Error(`Zeile ${index + 2}: Name oder Firma fehlt.`);
        error.statusCode = 400;
        throw error;
    }
    const email = importText(row?.email, 320)?.toLowerCase() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        const error = new Error(`Zeile ${index + 2}: E-Mail-Adresse ist ungültig.`);
        error.statusCode = 400;
        throw error;
    }
    return {
        customerNumber: importText(row?.customerNumber, 100),
        firstName,
        lastName,
        companyName,
        email,
        phoneMobile: importText(row?.phoneMobile, 100),
        phoneLandline: importText(row?.phoneLandline, 100),
        preferredContact: importText(row?.preferredContact, 100),
        customerStatus: "active",
        source: importText(row?.source, 100) || "CSV-Import",
        notes: importText(row?.notes, 5000),
        address: {
            street: importText(row?.street, 200),
            houseNumber: importText(row?.houseNumber, 50),
            postalCode: importText(row?.postalCode, 30),
            city: importText(row?.city, 200),
            country: importText(row?.country, 100)
        }
    };
};

export const importCustomers = async (req, res) => {
    const rows = Array.isArray(req.body?.customers) ? req.body.customers : null;
    if (!rows || rows.length === 0 || rows.length > 1000) {
        return res.status(400).json({ message: "Bitte 1 bis 1.000 Kontakte übergeben." });
    }

    try {
        const normalized = rows.map(normalizeImportedCustomer);
        const result = await prisma.$transaction(async transaction => {
            let imported = 0;
            let skipped = 0;
            for (const item of normalized) {
                const duplicateFilters = [];
                if (item.customerNumber) duplicateFilters.push({ customerNumber: item.customerNumber });
                if (item.email) duplicateFilters.push({ email: { equals: item.email, mode: "insensitive" } });
                if (duplicateFilters.length && await transaction.customer.findFirst({
                    where: { OR: duplicateFilters },
                    select: { id: true }
                })) {
                    skipped += 1;
                    continue;
                }

                const { address, ...customerData } = item;
                await transaction.customer.create({
                    data: {
                        ...customerData,
                        createdById: req.user.id,
                        addresses: {
                            create: { ...address, tenantId: req.tenant.id }
                        }
                    }
                });
                imported += 1;
            }
            return { imported, skipped, total: rows.length };
        });
        return res.status(201).json(result);
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        if (error?.code === "P2002") return res.status(409).json({ message: "Eine Kundennummer ist bereits vorhanden." });
        console.error("Kundenimport fehlgeschlagen:", error);
        return res.status(500).json({ message: "Kontakte konnten nicht importiert werden." });
    }
};


export const getCustomers = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = 20;
    const skip = (page - 1) * limit;
    const customerWhere = { deletedAt: null };
    const activeWhere = {
      ...customerWhere,
      ...createCustomerDisplayStatusWhere("active"),
    };
    const inactiveWhere = {
      ...customerWhere,
      ...createCustomerDisplayStatusWhere("inactive"),
    };

    const [activeCustomersCount, totalCustomers] = await Promise.all([
      prisma.customer.count({ where: activeWhere }),
      prisma.customer.count({ where: customerWhere }),
    ]);

    const activeTake = skip < activeCustomersCount
      ? Math.min(limit, activeCustomersCount - skip)
      : 0;
    const activeCustomers = activeTake > 0
      ? await prisma.customer.findMany({
          where: activeWhere,
          orderBy: customerOrderBy,
          skip,
          take: activeTake,
          include: customerListInclude,
        })
      : [];

    const inactiveTake = limit - activeCustomers.length;
    const inactiveSkip = Math.max(skip - activeCustomersCount, 0);
    const inactiveCustomers = inactiveTake > 0
      ? await prisma.customer.findMany({
          where: inactiveWhere,
          orderBy: customerOrderBy,
          skip: inactiveSkip,
          take: inactiveTake,
          include: customerListInclude,
        })
      : [];

    const customers = [
      ...activeCustomers.map(customer => ({
        ...customer,
        customerStatus: "active",
      })),
      ...inactiveCustomers.map(customer => ({
        ...customer,
        customerStatus: "inactive",
      })),
    ];

    res.status(200).json({
      customers,
      currentPage: page,
      totalPages: Math.ceil(totalCustomers / limit),
      totalCustomers,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
};


export const updateCustomer = async (req, res) => {
  try {

    const customer = await prisma.customer.update({
      where: {
        id: req.params.id,
      },

      data: {

                firstName: req.body.firstName,
                lastName: req.body.lastName,
                companyName: req.body.companyName,
                email: req.body.email,
                phoneMobile: req.body.phoneMobile,
                phoneLandline: req.body.phoneLandline,
                preferredContact: req.body.preferredContact,
                newsletterOptIn: req.body.newsletterOptIn,
                customerRating: req.body.customerRating,
                source: req.body.source,
                notes: req.body.notes,

                addresses: {
                    update: {where: { id: req.body.addressId },
                    data: {
                        street: req.body.street,
                        houseNumber: req.body.houseNumber,
                        postalCode: req.body.postalCode,
                        city: req.body.city,
                        country: req.body.country,
                        floor: req.body.floor,
                        elevatorAvailable: req.body.elevatorAvailable,
                        parkingInfo: req.body.parkingInfo
                    }
                    },
                },
            }, include: {
                addresses: true
            }
    });

    res.status(200).json(customer);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
};


export const getCustomerInfo = async (req, res) => {
  try {

   const customer = await prisma.customer.findUnique({
  where: {
    id: req.params.id,
  },
  include: {
    addresses: true,
    paperlessDocuments: {
      orderBy: { linkedAt: "desc" }
    },
  },
});

    res.status(200).json({
      customer
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
};

export const createCustomerSearchQuery = (user, search) => {
    const mayViewContactData = ["admin", "manager"].includes(user?.role);
    const nameFilters = [
        {
            firstName: {
                contains: search,
                mode: "insensitive"
            }
        },
        {
            lastName: {
                contains: search,
                mode: "insensitive"
            }
        }
    ];

    return {
        where: {
            deletedAt: null,
            OR: mayViewContactData
                ? [
                    ...nameFilters,
                    {
                        companyName: {
                            contains: search,
                            mode: "insensitive"
                        }
                    }
                ]
                : nameFilters
        },
        orderBy: customerOrderBy,
        take: 15,
        ...(mayViewContactData ? {} : {
            select: {
                id: true,
                firstName: true,
                lastName: true
            }
        })
    };
};


export const searchCustomers = async (req, res) => {

    try {

        const search = String(req.query.search ?? "").trim();

        if (search.length < 2) {
            return res.status(200).json([]);
        }

        const includeDisplayStatus = req.query.includeDisplayStatus === "true"
            && ["admin", "manager"].includes(req.user?.role);
        const customers = await prisma.customer.findMany({
            ...createCustomerSearchQuery(req.user, search),
            ...(includeDisplayStatus ? {
                include: {
                    ...customerListInclude,
                    projects: {
                        where: { deletedAt: null },
                        select: { status: true }
                    }
                }
            } : {})
        });

        if (includeDisplayStatus) {
            const customersWithStatus = customers
                .map(({ projects, ...customer }) => ({
                    ...customer,
                    customerStatus: getCustomerDisplayStatus(projects)
                }))
                .sort((first, second) => (
                    Number(first.customerStatus === "inactive")
                    - Number(second.customerStatus === "inactive")
                ));

            return res.status(200).json(customersWithStatus);
        }

        res.status(200).json(customers);

    }

    catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Internal server error"
        });

    }

};
