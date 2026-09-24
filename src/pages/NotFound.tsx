import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="card mx-auto mt-6 max-w-md p-10 text-center">
      <div className="font-jp text-6xl font-bold text-sakura-300">迷子</div>
      <h1 className="mt-3 text-xl font-extrabold">Lạc đường rồi! (404)</h1>
      <Link to="/" className="btn-primary mt-6">Về Tổng quan</Link>
    </div>
  )
}
