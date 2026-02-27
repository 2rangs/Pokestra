const baseUrl = 'https://pokeapi.co/api/v2/'

const get = async <T>(endpoint: string): Promise<T> => {
    const res = await fetch(`${baseUrl}${endpoint}`)
    if (!res.ok) throw new Error(`API Error: ${res.status}`)
    return res.json()
}

export const api = { get }