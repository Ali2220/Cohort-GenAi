import { tool } from "@langchain/core/tools";
import * as z from "zod";

export const getOffers = tool(
    () => {
        return JSON.stringify([
            {
                code: 'LAUNCH',
                discount_percent: 30
            },
            {
                code: 'FIRST_20',
                discount_percent: 30
            }
        ])
    },
    {
        name: 'getOffers',
        description: 'Call this tool to get the available discounts and offers',
    }
)

