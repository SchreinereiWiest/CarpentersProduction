export function toFloat  (val) {

    if (val === undefined || val === null) {
      return null;
    }

    return parseFloat(
      val.toString().replace(",", ".")
    );
  };



export function parseCadJson (data) {
  
      const groups = {};
  
      data.forEach(item => {
  
        const parentID =
          item.PID.substring(0, 3);
  
        const childID =
          item.PID.substring(3, 6);
  
        const parsedItem = {
  
          ...item,
  
          L: toFloat(item.L),
          B: toFloat(item.B),
          T: toFloat(item.T),
  
          X: toFloat(item.X),
          Y: toFloat(item.Y),
          Z: toFloat(item.Z),
  
          RX: toFloat(item.RX),
          RY: toFloat(item.RY),
          RZ: toFloat(item.RZ),
  
          OX: toFloat(item.OX),
          OY: toFloat(item.OY),
          OZ: toFloat(item.OZ),
        };
  
        if (!groups[parentID]) {
          groups[parentID] = null;
        }
        // Hauptobjekt
  
        if (childID === "000") {
          groups[parentID] = {
  
            ...parsedItem,
  
            Children: []
          };
        } else {
  
          if (!groups[parentID]) {
  
            groups[parentID] = {
  
              PID: parentID + "000",
  
              Children: []
            };
          }
  
          groups[parentID]
            .Children
            .push(parsedItem);
        }
      });
  
      return Object.values(groups);
  
    };