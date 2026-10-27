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
