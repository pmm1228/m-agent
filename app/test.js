const users = [
  { name: 'Alice', score: 92 },
  { name: 'Bob', score: 76 },
  { name: 'Charlie', score: 88 },
]

function getTopUser(list) {
  return list.reduce((top, user) => (user.score > top.score ? user : top), list[0])
}

const topUser = getTopUser(users)

console.log('Test script is running...')
console.log(`Top user: ${topUser.name}, score: ${topUser.score}`)
console.log('test.... jius')

export { getTopUser }
