import { Months } from "../enums";
import sched from "../schedule.json";

const months = Object.keys(Months);
const scheduleJson = Object.keys(sched);

type Errors = {
    month: string;
    abbrev: string;
};

test("Values in Months enum matches keys in schedule.json", () => {
    let errors: Errors[] = [];

    months.forEach((month) => {
        const abbrev = Months[month as "January"];
        !scheduleJson.includes(abbrev)
            ? errors.push({
                  month,
                  abbrev,
              })
            : errors;
    });

    if (errors.length)
        console.log({
            errors,
        });
    expect(errors.length).toBe(0);
});
