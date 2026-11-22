import { getStore } from '@netlify/blobs'

let factory = () => getStore({ name: 'ybcrave', consistency: 'strong' })

/** החנות היחידה של האתר. קריאות חזקות (strong) כדי שמנהלים יראו שינויים מיד. */
export const db = () => factory()

/** לבדיקות מקומיות בלבד */
export const setStoreFactory = (f) => {
  factory = f
}
