import prisma from "../config/prisma.js";

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

                firstName: req.body.firstName,
                lastName: req.body.lastName,
                companyName: req.body.companyName,
                email: req.body.email,
                phoneMobile: req.body.phoneMobile,
                phoneLandline: req.body.phoneLandline,
                preferredContact: req.body.preferredContact,
                newsletterOptIn: req.body.newsletterOptIn,
                customerStatus: req.body.customerStatus,
                customerRating: req.body.customerRating,
                source: req.body.source,
                notes: req.body.notes,

                addresses: {
                    create: {
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
    const page = Number(req.query.page) || 1;
    const limit = 20;

    const skip = (page - 1) * limit;

    const [customers, totalCustomers] = await Promise.all([
      prisma.customer.findMany({
        orderBy: [
          {
            lastName: "asc",
          },
          {
            firstName: "asc",
          },
        ],
        skip,
        take: limit,
        include: {
          addresses: true,
        },
      }),

      prisma.customer.count(),
    ]);

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
                customerStatus: req.body.customerStatus,
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
