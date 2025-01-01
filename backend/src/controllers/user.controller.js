import {User} from "../models/User.model.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import {ApiResponse} from "../utils/ApiResponse.js";

const generateAccessAndRefreshToken = async (userId) => {
    try {

        console.log("UserId: ", userId)

        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken()

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave:false})

        return {accessToken, refreshToken};
    } catch (error) {
        throw new ApiError(500, "Failed to generate tokens");
    }
};

export const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password, bio } = req.body;
    if (
       [username, email, password].some(
           (field) => field?.trim() === ""
       )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })


    if (existedUser) {
        throw new ApiError(409, "User already exists");
    }

    const profilePicLocalPath = req.files?.profilePic[0]?.path;
    console.log("profilePicLocalPath", profilePicLocalPath);

    const user = await User.create({
        username: username.toLowerCase(),
        email,
        password,
        bio: bio || "",
        profilePicLocalPath: profilePicLocalPath?.url || "",
    })

    const isCreated = await User.findById(user._id).select("-password -refreshToken");

    console.log("isCreated" + isCreated)

    if (!isCreated) {
        throw new ApiError(500, "Something went wrong on Server");
    }

    return res.status(201).json(new ApiResponse(201, isCreated, "User registered successfully"));
})

export const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    if(!(username || email)) {
        throw new ApiError(400, "Username or password is required");
    }

    const isExists = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!isExists) {
        throw new ApiError(404, "User doesn't exists");
    }

    const isPasswordMatch = await isExists.isPasswordCorrect(password);

    if (!isPasswordMatch) {
        throw new ApiError(404, "Invalid password");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        isExists._id
    );

    console.log(accessToken, refreshToken)

    const loggedInUser = await User.findById(isExists._id).select("-password -refreshToken");
    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, {
                user: loggedInUser,
                accessToken,
                refreshToken,
            })
        );
})

export const logoutUser = asyncHandler(async (req, res) => {
    User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1,
            },
        },
        {
            new: true
        }
    );

    const options = {
        httpOnly: true,
        secure: true,
    }

    res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, true, "User logged out"));
})

export const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh Token not found")
    }

    try {
        const decoded = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        );

        const user = await User.findById(decoded?._id)

        if (!user) {
            throw new ApiError(401, "Unauthorized refresh token");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh Token is expired");
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = generateAccessAndRefreshToken(user?._id)

        res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(new ApiResponse(200, {
                accessToken,
                newRefreshToken,
            }, "Access Refresh Token"));
    } catch (error) {
        throw new ApiError(401, error?.message);
    }
})