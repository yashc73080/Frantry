const EXPIRY_DAYS_LOOKUP: { [key: string]: number } = {
    "Milk": 7,
    "Eggs": 14,
    "Chicken": 3,
    "Cheese": 14,
    "Bread": 5,
    "Yogurt": 10,
    "Lettuce": 5,
  };
  
  export const inferExpiryDates = (ocrText: string) => {
    const itemsWithExpiry: { name: string; expiry: string }[] = [];
    const today = new Date();
  
    // Normalize text (lowercase and split into words)
    const words = ocrText.toLowerCase().split(/\s+/);
  
    Object.keys(EXPIRY_DAYS_LOOKUP).forEach((item) => {
      if (words.includes(item.toLowerCase())) {
        const expiryDate = new Date(today);
        expiryDate.setDate(today.getDate() + EXPIRY_DAYS_LOOKUP[item]);
        itemsWithExpiry.push({
          name: item,
          expiry: expiryDate.toISOString().split("T")[0],
        });
      }
    });
  
    return itemsWithExpiry;
  };
  