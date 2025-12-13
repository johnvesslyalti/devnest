import { homeRepo } from "./home.repo"

export const homeService = {
    findPosts() {
        homeRepo.findAllPosts()
    }
}