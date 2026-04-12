const cleanNumber = (val) => {
  if (val === undefined || val === null) return 0;
  const cleanVal = String(val).replace(/,/g, '').replace(/[^0-9.-]/g, '').trim();
  const num = Number(cleanVal);
  return isNaN(num) ? 0 : num;
};

export const groupBySum = (data, groupField, valueField) => {
  const result = {};

  data.forEach((item) => {
    const key = item[groupField] || "Unknown";
    const value = cleanNumber(item[valueField]);

    if (!result[key]) {
      result[key] = 0;
    }

    result[key] += value;
  });

  return Object.entries(result).map(([key, value]) => ({
    [groupField]: key,
    [valueField]: value, // Match the exact yAxisKey Recharts is looking for
  }));
};

// Top N
export const getTopN = (data, field, limit = 5) => {
  // Use [...data] to create a copy so we don't mutate the original uploaded CSV memory!
  return [...data]
    .sort((a, b) => cleanNumber(b[field]) - cleanNumber(a[field]))
    .slice(0, limit);
};

// Filter
export const filterData = (data, field, operator, value) => {
  return data.filter((item) => {
    let itemVal = item[field];
    if (itemVal === undefined || itemVal === null) return false;

    // Clean strings to extract pure numbers
    const cleanItemVal = String(itemVal).replace(/,/g, '').replace(/[^0-9.-]/g, '').trim();
    const cleanFilterVal = String(value).replace(/,/g, '').replace(/[^0-9.-]/g, '').trim();
    
    // If both look like numbers, do a numeric comparison
    const isNum = !isNaN(Number(cleanItemVal)) && cleanItemVal !== "" && !isNaN(Number(cleanFilterVal)) && cleanFilterVal !== "";

    switch (operator) {
      case '>':
        return isNum ? Number(cleanItemVal) > Number(cleanFilterVal) : itemVal > value;
      case '<':
        return isNum ? Number(cleanItemVal) < Number(cleanFilterVal) : itemVal < value;
      case '>=':
        return isNum ? Number(cleanItemVal) >= Number(cleanFilterVal) : itemVal >= value;
      case '<=':
        return isNum ? Number(cleanItemVal) <= Number(cleanFilterVal) : itemVal <= value;
      case 'includes':
        return String(itemVal).toLowerCase().includes(String(value).toLowerCase());
      case '=':
      default:
        return isNum ? Number(cleanItemVal) === Number(cleanFilterVal) : String(itemVal).toLowerCase() === String(value).toLowerCase();
    }
  });
};